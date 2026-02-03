<script lang="ts">
	import { slide, fade } from 'svelte/transition';
	import { createEventDispatcher, getContext } from 'svelte';
	import type { Writable } from 'svelte/store';
	import type { i18n as i18nType } from 'i18next';

	const i18n = getContext<Writable<i18nType>>('i18n');

	export let title: string = 'Search';
	export let status: 'progress' | 'complete' | 'error' = 'progress';
	export let resultsCount: number = 0;
	export let sources: Array<{ title: string; url: string; snippet?: string; favicon?: string }> = [];
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

	$: isComplete = status === 'complete';
	$: isError = status === 'error';
	$: displayCount = sources.length || resultsCount;
	$: countLabel = displayCount === 1 ? 'fuente' : 'fuentes';
</script>

<div
	class="search-block my-2 rounded-xl border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50 transition-all duration-200 overflow-hidden"
	transition:fade={{ duration: 150 }}
>
	<!-- Header -->
	<button
		class="flex w-full items-center gap-2 px-3 py-2.5 text-left hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
		on:click={toggleExpand}
		disabled={sources.length === 0}
	>
		<!-- Icon -->
		<div class="flex-shrink-0">
			{#if isError}
				<svg class="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
						d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
				</svg>
			{:else}
				<svg class="w-4 h-4 text-gray-500 {status === 'progress' ? 'animate-pulse' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
						d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
				</svg>
			{/if}
		</div>

		<!-- Title -->
		<span class="flex-1 text-sm font-medium text-gray-700 dark:text-gray-300">
			{title}
		</span>

		<!-- Count badge -->
		{#if displayCount > 0}
			<span class="text-xs px-2 py-0.5 rounded-full bg-gray-200/50 text-gray-600 dark:bg-gray-700/50 dark:text-gray-400">
				{displayCount} {countLabel}
			</span>
		{/if}

		<!-- Status indicator -->
		{#if status === 'progress'}
			<div class="flex-shrink-0">
				<div class="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
			</div>
		{:else if isComplete}
			<svg class="w-4 h-4 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
			</svg>
		{/if}

		<!-- Expand chevron -->
		{#if sources.length > 0}
			<svg
				class="w-4 h-4 text-gray-400 transition-transform duration-200 flex-shrink-0 {isExpanded ? 'rotate-180' : ''}"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
			>
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
			</svg>
		{/if}
	</button>

	<!-- Sources list -->
	{#if isExpanded && sources.length > 0}
		<div class="px-2 pb-2 border-t border-gray-200/50 dark:border-gray-700/50" transition:slide={{ duration: 200 }}>
			<div class="space-y-1 pt-2">
				{#each sources as source, idx}
					<button
						class="w-full text-left p-2 rounded-lg hover:bg-white/50 dark:hover:bg-gray-800/50 transition-colors group"
						on:click|stopPropagation={() => openSource(source.url)}
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

<style>
	.line-clamp-2 {
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
</style>
