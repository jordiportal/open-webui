<script lang="ts">
	import { slide, fade } from 'svelte/transition';
	import { createEventDispatcher, getContext } from 'svelte';
	import type { Writable } from 'svelte/store';
	import type { i18n as i18nType } from 'i18next';

	const i18n = getContext<Writable<i18nType>>('i18n');
	const dispatch = createEventDispatcher();

	export let content: string = '';
	export let status: 'start' | 'progress' | 'complete' | 'error' = 'progress';
	export let collapsed: boolean = false;
	export let title: string = '';

	let isExpanded = !collapsed;

	function toggleExpand() {
		isExpanded = !isExpanded;
	}

	$: displayTitle = title || $i18n.t('Thinking...');
	$: isComplete = status === 'complete';
	$: isError = status === 'error';
</script>

<div
	class="brain-thinking-block my-2 rounded-xl border transition-all duration-200
		{isError ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20' : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50'}"
	transition:fade={{ duration: 150 }}
>
	<!-- Header -->
	<button
		class="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-t-xl transition-colors"
		on:click={toggleExpand}
	>
		<!-- Animated thinking indicator -->
		<div class="flex-shrink-0">
			{#if isComplete}
				<svg class="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
				</svg>
			{:else if isError}
				<svg class="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
				</svg>
			{:else}
				<!-- Animated brain/thinking icon -->
				<div class="relative">
					<svg class="w-4 h-4 text-purple-500 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
							d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
					</svg>
					<span class="absolute -top-1 -right-1 flex h-2 w-2">
						<span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
						<span class="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
					</span>
				</div>
			{/if}
		</div>

		<span class="flex-1 text-sm font-medium text-gray-700 dark:text-gray-300">
			{displayTitle}
		</span>

		<!-- Expand/collapse indicator -->
		<svg
			class="w-4 h-4 text-gray-500 transition-transform duration-200 {isExpanded ? 'rotate-180' : ''}"
			fill="none"
			stroke="currentColor"
			viewBox="0 0 24 24"
		>
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
		</svg>
	</button>

	<!-- Content -->
	{#if isExpanded && content}
		<div
			class="px-3 pb-3 pt-1"
			transition:slide={{ duration: 200 }}
		>
			<div
				class="text-sm text-gray-600 dark:text-gray-400 font-mono whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto scrollbar-thin"
			>
				{content}
				{#if !isComplete && !isError}
					<span class="inline-block w-2 h-4 bg-purple-500 animate-pulse ml-0.5"></span>
				{/if}
			</div>
		</div>
	{/if}
</div>

<style>
	.scrollbar-thin::-webkit-scrollbar {
		width: 4px;
	}
	.scrollbar-thin::-webkit-scrollbar-track {
		background: transparent;
	}
	.scrollbar-thin::-webkit-scrollbar-thumb {
		background-color: rgba(156, 163, 175, 0.5);
		border-radius: 2px;
	}
</style>
