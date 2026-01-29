<script lang="ts">
	import { fade, slide } from 'svelte/transition';
	import { createEventDispatcher, getContext, tick } from 'svelte';
	import type { Writable } from 'svelte/store';
	import type { i18n as i18nType } from 'i18next';
	import { copyToClipboard } from '$lib/utils';
	import { toast } from 'svelte-sonner';

	const i18n = getContext<Writable<i18nType>>('i18n');
	const dispatch = createEventDispatcher();

	interface ConsoleEntry {
		type: 'stdout' | 'stderr' | 'system' | 'input';
		content: string;
		timestamp?: number;
	}

	export let entries: ConsoleEntry[] = [];
	export let title: string = '';
	export let language: string = '';
	export let isRunning: boolean = false;
	export let collapsed: boolean = false;

	let consoleElement: HTMLDivElement;
	let isExpanded = !collapsed;

	// Auto-scroll to bottom when new entries arrive
	$: if (entries.length && consoleElement) {
		tick().then(() => {
			consoleElement.scrollTop = consoleElement.scrollHeight;
		});
	}

	function toggleExpand() {
		isExpanded = !isExpanded;
	}

	function copyContent() {
		const text = entries.map(e => e.content).join('\n');
		copyToClipboard(text);
		toast.success($i18n.t('Copied to clipboard'));
	}

	function clearConsole() {
		dispatch('clear');
	}

	function getEntryClass(type: string): string {
		switch (type) {
			case 'stderr':
				return 'text-red-400';
			case 'system':
				return 'text-blue-400';
			case 'input':
				return 'text-green-400';
			default:
				return 'text-gray-300';
		}
	}

	function formatTimestamp(ts?: number): string {
		if (!ts) return '';
		const date = new Date(ts);
		return date.toLocaleTimeString('en-US', { 
			hour12: false, 
			hour: '2-digit', 
			minute: '2-digit', 
			second: '2-digit' 
		});
	}
</script>

<div
	class="console-viewer rounded-xl border border-gray-700 bg-gray-900 overflow-hidden"
	transition:fade={{ duration: 150 }}
>
	<!-- Header -->
	<div class="flex items-center justify-between px-3 py-2 bg-gray-800 border-b border-gray-700">
		<button
			class="flex items-center gap-2 flex-1 text-left"
			on:click={toggleExpand}
		>
			<!-- Terminal icon -->
			<div class="relative">
				<svg class="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
						d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
				</svg>
				{#if isRunning}
					<span class="absolute -top-1 -right-1 flex h-2 w-2">
						<span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
						<span class="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
					</span>
				{/if}
			</div>

			<span class="text-sm font-medium text-gray-300">
				{title || $i18n.t('Console')}
				{#if language}
					<span class="text-xs text-gray-500 ml-1">({language})</span>
				{/if}
			</span>

			<!-- Expand indicator -->
			<svg
				class="w-4 h-4 text-gray-500 ml-auto transition-transform duration-200 {isExpanded ? 'rotate-180' : ''}"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
			>
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
			</svg>
		</button>

		<!-- Actions -->
		<div class="flex items-center gap-1 ml-2">
			<button
				class="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
				on:click={copyContent}
				title={$i18n.t('Copy')}
			>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
						d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
				</svg>
			</button>

			<button
				class="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
				on:click={clearConsole}
				title={$i18n.t('Clear')}
			>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
						d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
				</svg>
			</button>
		</div>
	</div>

	<!-- Console content -->
	{#if isExpanded}
		<div
			bind:this={consoleElement}
			class="console-content p-3 font-mono text-sm max-h-64 overflow-y-auto"
			transition:slide={{ duration: 200 }}
		>
			{#if entries.length === 0}
				<div class="text-gray-500 text-center py-4">
					{#if isRunning}
						<div class="flex items-center justify-center gap-2">
							<svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
								<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
								<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
							</svg>
							<span>{$i18n.t('Running...')}</span>
						</div>
					{:else}
						{$i18n.t('No output yet')}
					{/if}
				</div>
			{:else}
				{#each entries as entry, idx}
					<div class="console-line flex {getEntryClass(entry.type)} leading-relaxed">
						{#if entry.timestamp}
							<span class="text-gray-600 mr-2 flex-shrink-0">[{formatTimestamp(entry.timestamp)}]</span>
						{/if}
						{#if entry.type === 'input'}
							<span class="text-gray-500 mr-1">$</span>
						{:else if entry.type === 'stderr'}
							<span class="text-red-500 mr-1">!</span>
						{/if}
						<span class="whitespace-pre-wrap break-all">{entry.content}</span>
					</div>
				{/each}
				{#if isRunning}
					<div class="console-line text-green-400 flex items-center">
						<span class="animate-pulse">█</span>
					</div>
				{/if}
			{/if}
		</div>
	{/if}
</div>

<style>
	.console-content {
		background: #0d1117;
	}
	.console-content::-webkit-scrollbar {
		width: 6px;
	}
	.console-content::-webkit-scrollbar-track {
		background: transparent;
	}
	.console-content::-webkit-scrollbar-thumb {
		background-color: rgba(255, 255, 255, 0.2);
		border-radius: 3px;
	}
	.console-line {
		min-height: 1.25rem;
	}
</style>
