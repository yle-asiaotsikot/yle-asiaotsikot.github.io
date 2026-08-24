<script lang="ts">
	import Feed from '$lib/Feed.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	let feed = $derived(data.feed);
	let error = $derived(data.error);
</script>

<Feed {feed} />

{#if error}
	<p class="container mx-auto px-4 text-red-600 md:px-8">
		Syötteen lataaminen epäonnistui. Yritä myöhemmin uudelleen.
	</p>
{/if}

<!-- <div class="container mx-auto py-8 md:px-8">
	<h1 class="mx-4 text-2xl font-bold md:mx-0">YLE Asiaotsikot</h1>
	<p class="mx-4 mb-6 font-semibold md:mx-0">
		Luetuimmat {new Date(data.date ?? 0)?.toLocaleString('fi-FI')}
	</p>

	{#if data.error}
		<div class="rounded border border-red-400 bg-red-100 px-4 py-3 text-red-700">
			<p>{data.error}</p>
		</div>
	{:else if data.articles.length === 0}
		<p class="text-gray-600">No articles found in the database.</p>
	{:else}
		<div class="grid gap-4">
			{#each data.articles as article}
				<div class="bg-[#1f2123] p-4 shadow-sm transition-shadow hover:shadow-md">
					<h2 class="mb-1 text-xl font-semibold">
						<a href={article.url} class="hover:underline" target="_blank"
							>{article.correctedTitle ?? article.title}</a
						>
					</h2>
					<div class="space-y-1 text-gray-300">
						<p class="font-medium">{article.description}</p>
						{#if article.correctedTitle}
							<p class="italic">Alkuperäinen otsikko: {article.title}</p>
						{/if}
						<p class="mt-2 text-sm">{aikaasitten(new Date(article.publishedAt ?? 0))}</p>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div> -->
