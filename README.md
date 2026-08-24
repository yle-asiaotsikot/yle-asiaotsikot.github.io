# YLE Asiaotsikot

A web application that fetches YLE's (Finnish Broadcasting Company) most popular news articles and uses AI to improve clickbait headlines, making them more informative and accurate.

## Overview

YLE Asiaotsikot is an automated news feed generator that:

- Fetches the latest news from YLE's RSS feed
- Uses AI (Google Claude) to analyze articles and improve clickbait titles
- Displays articles with corrected titles while showing the original title for comparison
- Updates automatically twice daily (around 7:10 and 16:10)

**Note:** This is not an official YLE website.

## Tech Stack

**Frontend** is staticly rendered SvelteKit and Tailwind CSS project. The frontend content is baked at build time due to rate limits, previous days are fetched on demand.

**Backend** consists of a periodically running node script that fetches news articles, processes them with AI, and stores them in a SQLite database to cache results. It then uploads the daily feed as `<date>.json` to a Cloudflare R2 bucket, which the frontend reads.

**Infrastructure** is handled with Github Actions, Pages, GHCR & Cloudflare R2. Docker image of the backend is automatically built and pushed to ghcr.io on every push. The backend will trigger a rebuild of the frontend using a webhook after processing new articles.

## Project Structure

```
yle-etusivu/
├── backend/          # News fetching & AI processing service
│   └── src/
│       ├── main.ts                    # Cron jobs, RSS fetching, AI title improvement
│       ├── r2.ts                      # Cloudflare R2 upload
│       ├── title-improvement-template.ts
│       └── utils.ts
├── frontend/         # SvelteKit web application
│   └── src/
│       ├── lib/
│       │   ├── Feed.svelte           # Main feed component
│       │   ├── api.ts
│       │   └── utils.ts
│       └── routes/
│           ├── +page.svelte          # Homepage
│           ├── [date]/               # Historical views
│           └── faq/                  # FAQ page
├── shared/           # Shared code (entities, types, database)
│   └── src/
│       ├── entities/                 # MikroORM entities
│       │   ├── Article.ts
│       │   ├── Collection.ts
│       │   └── ArticleInCollection.ts
│       ├── types/
│       │   └── feed.ts
│       └── mikro-orm.config.ts
├── data/             # SQLite database storage
├── docker-compose.yml
├── Dockerfile
└── package.json
```

## Getting Started

### Environment Variables

Create a `.env` file in the project root:

```env
# Required for AI title improvement
ANTHROPIC_API_KEY=your_anthropic_api_key

# Cloudflare R2
R2_ACCOUNT_ID=...
R2_API_TOKEN=...       # needs "Workers R2 Storage: Edit"
R2_BUCKET_NAME=...

# Optional
ARTICLE_COUNT=15  # Number of articles to fetch (default: 15)
```

See [`backend/.env.example`](./backend/.env.example), [`frontend/.env.example`](./frontend/.env.example), [`package.json`](./package.json)

## AI Usage

Github Copilot has been used to assist in writing parts of the codebase, and most of this README.
