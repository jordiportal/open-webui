<script lang="ts">
	import { slide, fade } from 'svelte/transition';

	export let title: string = '';
	export let status: 'progress' | 'complete' | 'error' = 'progress';
	export let icon: 'slides' | 'image' | 'document' | 'code' | 'data' | 'files' | 'web' | 'default' = 'default';
	export let items: Array<{ label: string; status?: string }> = [];
	export let collapsed: boolean = false;

	let isExpanded = !collapsed;

	function toggleExpand() {
		if (items.length > 0) {
			isExpanded = !isExpanded;
		}
	}

	// Icon paths for different activity types
	const iconPaths = {
		slides: 'M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z',
		image: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z',
		document: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
		code: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4',
		data: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
		files: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z',
		web: 'M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9',
		default: 'M13 10V3L4 14h7v7l9-11h-7z'
	};

	$: isComplete = status === 'complete';
	$: isError = status === 'error';
	$: iconPath = iconPaths[icon] || iconPaths.default;
	$: itemCount = items.length;
</script>

<div
	class="activity-block my-2 rounded-xl border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50 transition-all duration-200 overflow-hidden"
	transition:fade={{ duration: 150 }}
>
	<!-- Header -->
	<button
		class="flex w-full items-center gap-2 px-3 py-2.5 text-left hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
		on:click={toggleExpand}
		disabled={items.length === 0}
	>
		<!-- Activity icon (left) -->
		<div class="flex-shrink-0">
			{#if isError}
				<svg class="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
				</svg>
			{:else}
				<svg class="w-4 h-4 text-gray-500 {!isComplete ? 'animate-pulse' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={iconPath} />
				</svg>
			{/if}
		</div>

		<!-- Title -->
		<span class="flex-1 text-sm font-medium text-gray-700 dark:text-gray-300">
			{title}
		</span>

		<!-- Count badge -->
		{#if itemCount > 0}
			<span class="text-xs px-2 py-0.5 rounded-full bg-gray-200/50 text-gray-600 dark:bg-gray-700/50 dark:text-gray-400">
				{itemCount} {icon === 'slides' ? (itemCount === 1 ? 'slide' : 'slides') : 'items'}
			</span>
		{/if}

		<!-- Status indicator (right) -->
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
		{#if items.length > 0}
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

	<!-- Items list -->
	{#if isExpanded && items.length > 0}
		<div class="px-2 pb-2 border-t border-gray-200/50 dark:border-gray-700/50" transition:slide={{ duration: 200 }}>
			<div class="space-y-1 pt-2">
				{#each items as item, idx}
					<div class="flex items-center gap-2 p-2 rounded-lg bg-white/50 dark:bg-gray-800/50">
						<span class="text-xs font-medium text-gray-400 w-6">{idx + 1}.</span>
						<span class="flex-1 text-sm text-gray-600 dark:text-gray-400 truncate">{item.label}</span>
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>
