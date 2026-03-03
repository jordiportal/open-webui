<script lang="ts">
	import { slide, fade } from 'svelte/transition';

	export let title: string = '';
	export let subtitle: string = '';
	export let status: 'progress' | 'complete' | 'error' = 'progress';
	export let icon: string = 'default';
	export let collapsed: boolean = false;
	export let badge: string = '';
	export let durationMs: number | null = null;

	let isExpanded = !collapsed;

	function toggleExpand() {
		isExpanded = !isExpanded;
	}

	const iconPaths: Record<string, string> = {
		search: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
		image: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z',
		data: 'M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4',
		slides: 'M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z',
		web: 'M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9',
		code: 'M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
		files: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z',
		default: 'M13 10V3L4 14h7v7l9-11h-7z'
	};

	$: isComplete = status === 'complete';
	$: isError = status === 'error';
	$: iconPath = iconPaths[icon] || iconPaths.default;
	$: formattedDuration = durationMs != null ? (durationMs / 1000).toFixed(1) + 's' : '';
</script>

<div
	class="step-block my-2 rounded-xl border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50 transition-all duration-200 overflow-hidden"
	transition:fade={{ duration: 150 }}
>
	<!-- Header: double-line with toggle -->
	<button
		class="flex w-full items-start gap-2.5 px-3 py-2.5 text-left hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
		on:click={toggleExpand}
	>
		<!-- Icon -->
		<div class="flex-shrink-0 mt-0.5">
			{#if isError}
				<svg class="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
				</svg>
			{:else}
				<svg class="w-4 h-4 {isComplete ? 'text-green-500' : 'text-gray-500'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={iconPath} />
				</svg>
			{/if}
		</div>

		<!-- Title + Subtitle -->
		<div class="flex-1 min-w-0">
			<div class="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
				{title}
			</div>
			{#if subtitle}
				<div class="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5 {status === 'progress' ? 'animate-pulse' : ''}">
					{subtitle}
				</div>
			{/if}
		</div>

		<!-- Badge / Duration -->
		<div class="flex items-center gap-2 flex-shrink-0">
			{#if badge}
				<span class="text-xs px-2 py-0.5 rounded-full bg-gray-200/60 text-gray-600 dark:bg-gray-700/60 dark:text-gray-400">
					{badge}
				</span>
			{/if}
			{#if formattedDuration && isComplete}
				<span class="text-xs text-gray-400 dark:text-gray-500">
					{formattedDuration}
				</span>
			{/if}

			<!-- Status indicator -->
			{#if status === 'progress'}
				<div class="flex-shrink-0">
					<div class="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
				</div>
			{:else if isComplete}
				<svg class="w-4 h-4 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
				</svg>
			{/if}

			<!-- Chevron -->
			<svg
				class="w-3.5 h-3.5 text-gray-400 transition-transform duration-200 flex-shrink-0 {isExpanded ? 'rotate-180' : ''}"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
			>
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
			</svg>
		</div>
	</button>

	<!-- Collapsible content: child steps -->
	{#if isExpanded}
		<div class="px-3 pb-2.5 border-t border-gray-200/50 dark:border-gray-700/50" transition:slide={{ duration: 200 }}>
			<div class="pt-2 space-y-0.5 pl-6">
				<slot />
			</div>
		</div>
	{/if}
</div>
