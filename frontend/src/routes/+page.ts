import { getFeed } from '$lib/api';
import { getDateString } from '$lib/utils';
import type { PageLoad } from './$types';

export const load: PageLoad = async () => {
	const date = getDateString();
	const feed = await getFeed({ date }).catch((err) => {
		console.error('Error fetching feed:', err);
		return undefined;
	});

	return {
		feed: feed ?? { articles: [], generatedAt: date },
		error: feed ? undefined : 'Failed to fetch feed'
	};
};
