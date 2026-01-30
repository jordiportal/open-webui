<script lang="ts">
	import { getContext } from 'svelte';
	import type { Writable } from 'svelte/store';
	import type { i18n as i18nType } from 'i18next';
	import { copyToClipboard } from '$lib/utils';
	import { toast } from 'svelte-sonner';

	const i18n = getContext<Writable<i18nType>>('i18n');

	export let content: string = '';
	export let filename: string = 'download';
	export let mimeType: string = 'text/plain';
	export let showCopy: boolean = true;
	export let showDownload: boolean = true;
	export let showOpen: boolean = true;

	let copied = false;

	function handleCopy() {
		copyToClipboard(content);
		copied = true;
		toast.success($i18n.t('Copied to clipboard'));
		setTimeout(() => { copied = false; }, 2000);
	}

	function handleDownload() {
		const blob = new Blob([content], { type: mimeType });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = filename;
		a.click();
		URL.revokeObjectURL(url);
		toast.success($i18n.t('Downloaded'));
	}

	function handleOpen() {
		const blob = new Blob([content], { type: mimeType });
		const url = URL.createObjectURL(blob);
		window.open(url, '_blank');
	}
</script>

{#if showCopy}
	<button
		class="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
		on:click={handleCopy}
		title={$i18n.t('Copy')}
	>
		{#if copied}
			<svg class="w-3.5 h-3.5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
			</svg>
		{:else}
			<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
					d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
			</svg>
		{/if}
	</button>
{/if}

{#if showOpen}
	<button
		class="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
		on:click={handleOpen}
		title={$i18n.t('Open in new tab')}
	>
		<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
				d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
		</svg>
	</button>
{/if}

{#if showDownload}
	<button
		class="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
		on:click={handleDownload}
		title={$i18n.t('Download')}
	>
		<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
				d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
		</svg>
	</button>
{/if}

<slot />
