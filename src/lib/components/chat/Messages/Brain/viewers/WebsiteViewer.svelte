<script lang="ts">
	import { fade } from 'svelte/transition';
	import { getContext } from 'svelte';
	import type { Writable } from 'svelte/store';
	import type { i18n as i18nType } from 'i18next';
	import ViewerHeader from '../shared/ViewerHeader.svelte';

	const i18n = getContext<Writable<i18nType>>('i18n');

	export let content: string = '';
	export let title: string = '';
	export let format: 'url' | 'html' = 'url';

	let iframeElement: HTMLIFrameElement;
	let isLoading = true;
	let loadError = false;

	$: isUrl = format === 'url';
	$: displayUrl = isUrl ? content : '';

	function handleLoad() {
		isLoading = false;
	}

	function handleError() {
		isLoading = false;
		loadError = true;
	}

	function refresh() {
		if (iframeElement) {
			isLoading = true;
			loadError = false;
			if (isUrl) {
				iframeElement.src = content;
			} else {
				iframeElement.srcdoc = content;
			}
		}
	}

	function openInNewTab() {
		if (isUrl) {
			window.open(content, '_blank');
		} else {
			const blob = new Blob([content], { type: 'text/html' });
			const url = URL.createObjectURL(blob);
			window.open(url, '_blank');
		}
	}
</script>

<div class="website-viewer flex flex-col h-full bg-gray-900 rounded-lg overflow-hidden" transition:fade={{ duration: 150 }}>
	<ViewerHeader 
		title={title || (isUrl ? 'Website' : 'Preview')}
		icon="website" 
		iconColor="text-cyan-400"
	>
		<svelte:fragment slot="actions">
			<button
				class="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
				on:click={refresh}
				title={$i18n.t('Refresh')}
			>
				<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
						d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
				</svg>
			</button>
			<button
				class="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
				on:click={openInNewTab}
				title={$i18n.t('Open in new tab')}
			>
				<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
						d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
				</svg>
			</button>
		</svelte:fragment>
	</ViewerHeader>

	<!-- URL bar for URL format -->
	{#if isUrl && displayUrl}
		<div class="flex items-center gap-2 px-3 py-1.5 bg-gray-800/50 border-b border-gray-700">
			<svg class="w-3.5 h-3.5 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
					d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
			</svg>
			<span class="text-xs text-gray-400 truncate flex-1">{displayUrl}</span>
		</div>
	{/if}

	<!-- iframe content -->
	<div class="flex-1 relative bg-white">
		{#if isLoading}
			<div class="absolute inset-0 flex items-center justify-center bg-gray-950">
				<div class="flex items-center gap-2 text-gray-400">
					<svg class="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
						<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
						<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
					</svg>
					<span class="text-sm">{$i18n.t('Loading...')}</span>
				</div>
			</div>
		{/if}

		{#if loadError}
			<div class="absolute inset-0 flex items-center justify-center bg-gray-950">
				<div class="text-center">
					<svg class="w-12 h-12 mx-auto text-gray-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
							d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
					</svg>
					<p class="text-gray-400 text-sm">{$i18n.t('Failed to load content')}</p>
					<button
						class="mt-2 px-3 py-1 text-xs bg-gray-800 hover:bg-gray-700 rounded text-gray-300"
						on:click={refresh}
					>
						{$i18n.t('Try again')}
					</button>
				</div>
			</div>
		{/if}

		{#if isUrl}
			<iframe
				bind:this={iframeElement}
				src={content}
				title={title || 'Website'}
				class="w-full h-full border-0"
				sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
				on:load={handleLoad}
				on:error={handleError}
			></iframe>
		{:else}
			<iframe
				bind:this={iframeElement}
				srcdoc={content}
				title={title || 'Preview'}
				class="w-full h-full border-0"
				sandbox="allow-scripts"
				on:load={handleLoad}
				on:error={handleError}
			></iframe>
		{/if}
	</div>
</div>

<style>
	.website-viewer {
		min-height: 400px;
	}
</style>
