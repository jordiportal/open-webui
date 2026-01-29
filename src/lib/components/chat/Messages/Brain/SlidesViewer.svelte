<script lang="ts">
	import { fade } from 'svelte/transition';
	import { createEventDispatcher, getContext } from 'svelte';
	import type { Writable } from 'svelte/store';
	import type { i18n as i18nType } from 'i18next';
	import { copyToClipboard } from '$lib/utils';
	import { toast } from 'svelte-sonner';

	const i18n = getContext<Writable<i18nType>>('i18n');
	const dispatch = createEventDispatcher();

	export let content: string = '';
	export let title: string = '';

	let copied = false;

	function handleCopy() {
		copyToClipboard(content);
		copied = true;
		toast.success($i18n.t('Copied to clipboard'));
		setTimeout(() => { copied = false; }, 2000);
	}

	function downloadSlides() {
		const blob = new Blob([content], { type: 'text/html' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `${title || 'presentation'}.html`;
		a.click();
		URL.revokeObjectURL(url);
		toast.success($i18n.t('Downloaded'));
	}

	function openInNewTab() {
		const blob = new Blob([content], { type: 'text/html' });
		const url = URL.createObjectURL(blob);
		window.open(url, '_blank');
	}
</script>

<div class="slides-viewer flex flex-col h-full bg-gray-900 rounded-xl overflow-hidden" transition:fade={{ duration: 150 }}>
	<!-- Header -->
	<div class="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700 flex-shrink-0">
		<div class="flex items-center gap-2">
			<svg class="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
					d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
			</svg>
			<span class="text-sm font-medium text-white truncate">
				{title || $i18n.t('Presentation')}
			</span>
		</div>

		<div class="flex items-center gap-1">
			<!-- Copy -->
			<button
				class="p-1.5 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
				on:click={handleCopy}
				title={$i18n.t('Copy HTML')}
			>
				{#if copied}
					<svg class="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
					</svg>
				{:else}
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
							d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
					</svg>
				{/if}
			</button>

			<!-- Open in new tab -->
			<button
				class="p-1.5 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
				on:click={openInNewTab}
				title={$i18n.t('Open in new tab')}
			>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
						d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
				</svg>
			</button>

			<!-- Download -->
			<button
				class="p-1.5 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
				on:click={downloadSlides}
				title={$i18n.t('Download')}
			>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
						d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
				</svg>
			</button>
		</div>
	</div>

	<!-- Content - Vertical scroll with iframe -->
	<div class="flex-1 overflow-hidden">
		<iframe
			title="Presentation"
			srcdoc={content}
			class="w-full h-full border-0"
			sandbox="allow-scripts"
		></iframe>
	</div>
</div>
