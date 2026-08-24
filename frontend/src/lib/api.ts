import type { Feed } from 'shared';
import { getDateString } from './utils';

const bucketUrl = (import.meta.env.VITE_R2_BUCKET_URL as string | undefined);

export async function getFeed(opts: { date: string } = { date: getDateString() }): Promise<Feed> {
	const { date } = opts;

	if (!bucketUrl) {
		throw new Error('VITE_R2_BUCKET_URL is not set');
	}

	const url = `${bucketUrl}/${date}.json`;
	console.log(`Fetching frontpage for date: ${date} from ${url}`);

	const res = await fetch(url);

	if (res.status === 404) {
		return { articles: [], generatedAt: date };
	}

	if (!res.ok) {
		throw new Error(`Failed to fetch feed: ${res.status} ${res.statusText}`);
	}

	return (await res.json()) as Feed;
}
