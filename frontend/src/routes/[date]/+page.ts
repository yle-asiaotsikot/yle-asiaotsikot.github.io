import { getFeed } from '$lib/api';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params }) => {
	const feed = await getFeed({ date: params.date }).catch((err) => {
		console.error('Error fetching feed:', err);
		return undefined;
	});

	return {
		feed: feed ?? { articles: [], generatedAt: params.date },
		error: feed ? undefined : 'Failed to fetch feed'
	};
};
