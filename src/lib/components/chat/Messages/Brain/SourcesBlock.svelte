<script lang="ts">
	import { fade, slide } from 'svelte/transition';
	import { createEventDispatcher, getContext } from 'svelte';
	import type { Writable } from 'svelte/store';
	import type { i18n as i18nType } from 'i18next';

	const i18n = getContext<Writable<i18nType>>('i18n');
	const dispatch = createEventDispatcher();

	export let sources: Array<{ title: string; url: string; snippet?: string }> = [];
	export let collapsed: boolean = false;

	let isExpanded = !collapsed;

	function toggleExpand() {
		isExpanded = !isExpanded;
	}

	function openSource(url: string) {
		window.open(url, '_blank', 'noopener,noreferrer');
	}

	function getDomain(url: string): string {
		try {
			return new URL(url).hostname.replace('www.', '');
		} catch {
			return url;
		}
	}

	function getFaviconUrl(url: string): string {
		try {
			const domain = new URL(url).hostname;
			return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
		} catch {
			return '';
		}
	}
</script>

{#if sources.length > 0}
	<div
		class="brain-sources-block my-2 rounded-xl border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50 overflow-hidden"
		transition:fade={{ duration: 150 }}
	>
		<!-- Header -->
		<button
			class="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
			on:click={toggleExpand}
		>
			<svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
					d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
			</svg>

			<span class="flex-1 text-sm font-medium text-gray-700 dark:text-gray-300">
				{$i18n.t('Sources')} ({sources.length})
			</span>

			<svg
				class="w-4 h-4 text-gray-500 transition-transform duration-200 {isExpanded ? 'rotate-180' : ''}"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
			>
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
			</svg>
		</button>

		<!-- Sources list -->
		{#if isExpanded}
			<div class="px-2 pb-2" transition:slide={{ duration: 200 }}>
				<div class="space-y-1">
					{#each sources as source, idx}
						<button
							class="w-full text-left p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors group"
							on:click={() => openSource(source.url)}
						>
							<div class="flex items-start gap-2">
								<!-- Favicon -->
								<div class="flex-shrink-0 mt-0.5">
									{#if getFaviconUrl(source.url)}
										<img
											src={getFaviconUrl(source.url)}
											alt=""
											class="w-4 h-4 rounded"
											on:error={(e) => { const target = e.currentTarget; if (target instanceof HTMLElement) target.style.display = 'none'; }}
										/>
									{:else}
										<svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
												d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
										</svg>
									{/if}
								</div>

								<div class="flex-1 min-w-0">
									<!-- Title -->
									<div class="text-sm font-medium text-gray-700 dark:text-gray-300 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400">
										{source.title || getDomain(source.url)}
									</div>
									
									<!-- Domain -->
									<div class="text-xs text-gray-500 dark:text-gray-400 truncate">
										{getDomain(source.url)}
									</div>
									
									<!-- Snippet -->
									{#if source.snippet}
										<div class="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
											{source.snippet}
										</div>
									{/if}
								</div>

								<!-- External link icon -->
								<svg class="w-4 h-4 text-gray-400 group-hover:text-blue-500 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
								</svg>
							</div>
						</button>
					{/each}
				</div>
			</div>
		{/if}
	</div>
{/if}

<style>
	.line-clamp-2 {
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
</style>
