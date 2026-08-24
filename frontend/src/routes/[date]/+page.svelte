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
