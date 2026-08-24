import { google } from "@ai-sdk/google";
import { generateObject, generateText } from "ai";
import * as cheerio from "cheerio";
import "dotenv/config";
import {
  Article,
  ArticleInCollection,
  Collection,
  Feed,
  getDataSource,
  getDateString,
} from "shared";
import { fileURLToPath } from "url";
import z from "zod";
import {
  extractImprovedTitle,
  getTitleImprovementTemplate,
} from "./title-improvement-template";
import { logLLMObjectResponse, logLLMTextResponse } from "./utils";
import { uploadJson } from "./r2";
import { CronJob } from "cron";

const articleCount = Number(process.env.ARTICLE_COUNT) || 15;
const rateLimitRequestsPerMinute =
  Number(process.env.RATE_LIMIT_REQUESTS_PER_MINUTE) || 0;
const rateLimitRequestsPerDay =
  Number(process.env.RATE_LIMIT_REQUESTS_PER_DAY) || 0;
let dailyRequestCount = 0;

/**
 * Fetch articles from Yle RSS feed, save new ones to the database,
 * and create a new frontpage collection.
 */
async function fetchArticles() {
  const dataSource = await getDataSource();
  const em = dataSource.em.fork();

  const mostPopularArticles = await fetch(
    "https://yle.fi/rss/uutiset/paauutiset",
  )
    .then((r) => r.text())
    .then((xmlString) => {
      const doc = cheerio.load(xmlString, { xmlMode: true });

      // Process the parsed XML data
      const articles = doc("item")
        .map((i, el) => {
          const title = doc(el).find("title").text();
          const description = doc(el).find("description").text();
          const link = doc(el).find("guid").text();
          const publishedAt = new Date(doc(el).find("pubDate").text());

          return { title, description, link, publishedAt };
        })
        .get()
        .slice(0, articleCount);

      return articles;
    });

  const articles = await Promise.all(
    mostPopularArticles.map(async (articleData) => {
      const exists = await em.findOne(Article, {
        url: articleData.link,
      });

      if (!exists) {
        const newArticle = em.create(Article, {
          title: articleData.title,
          url: articleData.link,
          description: articleData.description,
          publishedAt: articleData.publishedAt,
        });

        console.log("Saved new article:", newArticle.title);
        await em.persistAndFlush(newArticle);
        return newArticle;
      } else {
        return exists;
      }
    }),
  );

  const frontpage = em.create(Collection, {});

  await em.persistAndFlush(frontpage);

  const promises = articles.map(async (article, index) => {
    const articleInCollection = em.create(ArticleInCollection, {
      article: article,
      collection: frontpage,
      order: index + 1,
    });
    await em.persistAndFlush(articleInCollection);
  });

  await Promise.all(promises);

  console.log("Created new frontpage with articles:", articles.length);
}

/**
 * Process articles that haven't had their titles improved yet.
 */
async function processArticles() {
  const dataSource = await getDataSource();
  const em = dataSource.em.fork();

  const articlesToProcess = await em
    .find(
      Collection,
      {},
      { populate: ["articles"], orderBy: { createdAt: "DESC" }, limit: 1 },
    )
    .then(
      (cols) =>
        cols[0]?.articles
          .filter((a) => !a.didProcessTitle)
          .slice(0, articleCount) || [],
    );

  console.log(`Found ${articlesToProcess.length} articles to process.`);

  for (const article of articlesToProcess) {
    console.log("Fetching article body for URL:", article.url);
    const articleBody = await fetch(article.url)
      .then((res) => res.text())
      .then((html) => {
        const doc = cheerio.load(html);

        console.log("Fetched article body for URL:", article.url);

        let body = "";
        const content = doc("section.yle__article__content, div.post-content");
        console.log("Article content length:", content.text().length);
        const paragraphs = content.find("p");
        console.log("Article paragraphs found:", paragraphs.length);
        paragraphs.each((i, el) => {
          body += doc(el).text() + "\n";
        });

        console.log("Extracted article body length:", body.length);

        return body;
      })
      .catch((err) => {
        console.error("Error fetching article body:", err);
        return "";
      });

    if (!articleBody) {
      console.warn("Could not extract body for article:", article.url);
      continue;
    }

    article.body = articleBody;
    await em.persistAndFlush(article);
  }

  for (const article of articlesToProcess) {
    if (
      rateLimitRequestsPerDay &&
      dailyRequestCount >= rateLimitRequestsPerDay
    ) {
      console.log(
        `Daily request limit of ${rateLimitRequestsPerDay} reached. Skipping processing.`,
      );
      continue;
    } else {
      dailyRequestCount++;
    }

    console.log("Generating improved title:", article.title, article.url);

    if (!article.body) {
      console.warn(
        `Can't process, article body is empty for URL: ${article.url}`,
      );
      continue;
    }

    const titleImprovementPrompt = getTitleImprovementTemplate({
      title: article.title,
      body: article.body,
    });

    const { object } = await generateObject({
      model: google("gemini-flash-latest"),
      schema: z.object({
        improvedTitle: z.string().optional(),
      }),
      prompt: titleImprovementPrompt,
    })
      .then(logLLMObjectResponse)
      .catch((err) => {
        console.error("Error generating improved title:", err);
        return { object: undefined };
      });

    if (!object) {
      console.error("Failed to extract improved title. No object returned.");
      continue;
    }

    console.log("Extracted object:", object, "\n\n===\n\n");

    article.correctedTitle = object.improvedTitle || undefined;
    article.didProcessTitle = true;
    await em.persistAndFlush(article);

    console.log(
      `Processed article: "${article.title}" -> "${article.correctedTitle}"`,
    );

    if (
      rateLimitRequestsPerMinute &&
      articlesToProcess.indexOf(article) < articlesToProcess.length - 1
    ) {
      const delay = (60 / rateLimitRequestsPerMinute) * 1000 + 2000;
      console.log(`Waiting for ${delay} ms to respect rate limits...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  console.log("Article processing completed.");
}

/**
 * Publish the latest frontpage collection to Cloudflare R2.
 */
async function publishFrontpage() {
  const dataSource = await getDataSource();
  const em = dataSource.em.fork();

  const date = getDateString();

  const collection = await em
    .find(
      Collection,
      {},
      { populate: ["articles"], orderBy: { createdAt: "DESC" }, limit: 1 },
    )
    .then((cols) => cols[0]);

  if (!collection) {
    console.error("No collection found to publish.");
    return;
  }

  const frontpage: Feed = {
    articles: collection.articles.map((article) => ({
      ...article,
      publishedAt: new Date(article.publishedAt as any)?.toISOString(),
      createdAt: new Date(article.createdAt)?.toISOString(),
      updatedAt: new Date(article.updatedAt)?.toISOString(),
    })),
    generatedAt: new Date(collection.createdAt)?.toISOString(),
  };

  const key = await uploadJson(`${date}.json`, frontpage);
  console.log(
    `Successfully uploaded frontpage to R2 at ${key} with ${frontpage.articles.length} articles`,
  );
}

async function main() {
  console.log("Starting scheduled job: fetch, process, publish frontpage");
  await getDataSource().then((ds) => ds.connect());
  await fetchArticles().catch(console.error);
  await processArticles().catch(console.error);
  await publishFrontpage().catch(console.error);
  await getDataSource().then((ds) => ds.close());
}

// Run if this file is executed directly
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  (async () => {
    await main();

    // Run once per day at 7.05 AM
    const job = new CronJob("5 7 * * *", async () => {
      dailyRequestCount = 0;
      await main();
    });

    // Run once per day at 4.05 PM
    const job2 = new CronJob("5 16 * * *", async () => {
      await main();
    });

    job.start();
    job2.start();
  })();
}
