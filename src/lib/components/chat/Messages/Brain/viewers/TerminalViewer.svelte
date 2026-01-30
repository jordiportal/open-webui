<script lang="ts">
	import { fade } from 'svelte/transition';
	import { getContext, tick } from 'svelte';
	import type { Writable } from 'svelte/store';
	import type { i18n as i18nType } from 'i18next';
	import ViewerHeader from '../shared/ViewerHeader.svelte';
	import ViewerActions from '../shared/ViewerActions.svelte';

	const i18n = getContext<Writable<i18nType>>('i18n');

	export let content: string = '';
	export let title: string = '';
	export let command: string = '';
	export let exitCode: number | null = null;
	export let cwd: string = '';

	let terminalElement: HTMLDivElement;

	// Parse ANSI codes to HTML (basic support)
	function parseAnsi(text: string): string {
		const ansiColors: Record<string, string> = {
			'30': 'color: #1e1e1e',
			'31': 'color: #f87171',
			'32': 'color: #4ade80',
			'33': 'color: #fbbf24',
			'34': 'color: #60a5fa',
			'35': 'color: #c084fc',
			'36': 'color: #22d3ee',
			'37': 'color: #e5e7eb',
			'90': 'color: #6b7280',
			'91': 'color: #fca5a5',
			'92': 'color: #86efac',
			'93': 'color: #fde047',
			'94': 'color: #93c5fd',
			'95': 'color: #d8b4fe',
			'96': 'color: #67e8f9',
			'97': 'color: #f9fafb',
			'1': 'font-weight: bold',
			'0': ''
		};

		// Escape HTML first
		let escaped = text
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;');

		// Parse ANSI escape sequences
		escaped = escaped.replace(/\x1b\[([0-9;]+)m/g, (match, codes) => {
			const codeList = codes.split(';');
			const styles = codeList
				.map((c: string) => ansiColors[c] || '')
				.filter(Boolean)
				.join('; ');
			
			if (styles) {
				return '</span><span style="' + styles + '">';
			}
			return '</span><span>';
		});

		return '<span>' + escaped + '</span>';
	}

	// Auto-scroll to bottom
	$: if (content && terminalElement) {
		tick().then(() => {
			terminalElement.scrollTop = terminalElement.scrollHeight;
		});
	}

	$: parsedContent = parseAnsi(content);
	$: statusColor = exitCode === null ? 'text-gray-400' : exitCode === 0 ? 'text-green-400' : 'text-red-400';
</script>

<div class="terminal-viewer flex flex-col h-full bg-gray-900 rounded-lg overflow-hidden" transition:fade={{ duration: 150 }}>
	<ViewerHeader 
		title={title || $i18n.t('Terminal')}
		subtitle={exitCode !== null ? 'exit: ' + exitCode : ''}
		icon="terminal" 
		iconColor="text-green-400"
	>
		<svelte:fragment slot="actions">
			<ViewerActions 
				{content} 
				filename="{title || 'terminal'}.txt"
				mimeType="text/plain"
				showOpen={false}
			/>
		</svelte:fragment>
	</ViewerHeader>

	<!-- Command bar if present -->
	{#if command || cwd}
		<div class="px-3 py-1.5 bg-gray-800/50 border-b border-gray-700 text-xs font-mono">
			{#if cwd}
				<span class="text-blue-400">{cwd}</span>
				<span class="text-gray-500 mx-1">$</span>
			{/if}
			{#if command}
				<span class="text-gray-300">{command}</span>
			{/if}
		</div>
	{/if}

	<!-- Terminal output -->
	<div 
		bind:this={terminalElement}
		class="terminal-content flex-1 overflow-y-auto p-3 font-mono text-sm"
	>
		{#if content}
			<pre class="whitespace-pre-wrap break-all text-gray-300 m-0">{@html parsedContent}</pre>
		{:else}
			<div class="text-gray-500 text-center py-4">
				{$i18n.t('No output')}
			</div>
		{/if}
	</div>

	<!-- Status bar -->
	{#if exitCode !== null}
		<div class="px-3 py-1.5 bg-gray-800/50 border-t border-gray-700 text-xs flex items-center gap-2">
			<span class={statusColor}>
				{exitCode === 0 ? 'Process completed successfully' : 'Process exited with code ' + exitCode}
			</span>
		</div>
	{/if}
</div>

<style>
	.terminal-viewer {
		min-height: 200px;
	}

	.terminal-content {
		background: #0d1117;
	}

	.terminal-content::-webkit-scrollbar {
		width: 6px;
	}

	.terminal-content::-webkit-scrollbar-track {
		background: transparent;
	}

	.terminal-content::-webkit-scrollbar-thumb {
		background-color: rgba(255, 255, 255, 0.2);
		border-radius: 3px;
	}
</style>
