export const getTitleImprovementTemplate = (opts: {
  articles: { id: number; title: string; body: string }[];
}) => {
  return `Your task is to review news headlines and (only if) necessary, modify them based on the contents of their articles to not include click bait. Example:

HS: Eagle S -aluksen varustamoa edustanut asianajaja sai huomautuksen
From the article: "Eagle S -säiliöaluksen varustamoa edustanut asianajaja Herman Ljungberg on saanut huomautuksen asianajajia valvovalta valvontalautakunnalta, kertoo Helsingin Sanomat. Lehti kertoo, että huomautuksen syynä ovat asianajajan medialle antamat lausunnot."

The above title doesn't require modifications since while the title does not state the type of notice, it can be considered unimportant and in most cases doesn't affect readers decision to click on the headline. For the reader, the most interesting part of the article is who (Herman Ljungberg, who has been in public eye before) it is about and what happened (the notice).

Example 2:

Tutkijat havaitsivat poikkeuksen 117-vuotiaaksi eläneessä – ”Kuin nuorella ihmisellä”
From the article: "Tutkijat havaitsivat, että Branyasin suolisto oli kuin nuorella ihmisellä. He uskovat, että hänen pitkän ja terveen elämänsä salaisuus oli suolistobakteerien tasapaino."

Corrected headline: Tutkijat havaitsivat poikkeuksen 117-vuotiaaksi eläneessä – ”Suolisto[bakteeristo] oli kuin nuorella ihmisellä”
The headline required correction, because to the reader the most interesting thing about the headline is what scientists think was the key behind her long life. Many people want to live longer, hence for most people the reason to her long life is the most interesting part of the article, as opposed to who the person was that lived long, for example.

Review each of the numbered articles below independently, and if necessary, fix its headline based on the article contents. For every article, return its id together with the corrected headline, or an empty string if no changes are necessary. Don't change the language of the headlines.

${opts.articles
  .map((article) => `<ARTICLE>${article.id}:\n${article.title}\n${article.body}</ARTICLE>`)
  .join("\n\n---\n\n")}`;
};

export const extractImprovedTitle = (opts: { analysis: string }) => {
  return `From the analysis below, extract the improved title only. If no improvements were suggested, return an empty string.

Analysis:
${opts.analysis}`;
};
