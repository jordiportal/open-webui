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
	let slides: string[] = [];
	let containerElement: HTMLDivElement;

	// CSS for slide iframes
	const SLIDE_CSS = [
		'* { margin: 0; padding: 0; box-sizing: border-box; }',
		'html, body { height: 100%; width: 100%; overflow: hidden; font-family: system-ui, sans-serif; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); color: #e4e4e7; }',
		'body { display: flex; align-items: center; justify-content: center; padding: 1.5rem; }',
		'.slide-wrapper { width: 100%; height: 100%; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; }',
		'h1, h2, h3 { margin-bottom: 0.75rem; line-height: 1.2; }',
		'h1 { font-size: 1.75rem; font-weight: 700; }',
		'h2 { font-size: 1.4rem; font-weight: 600; }',
		'h3 { font-size: 1.1rem; font-weight: 500; }',
		'p { font-size: 0.95rem; line-height: 1.5; margin-bottom: 0.5rem; }',
		'ul, ol { text-align: left; margin: 0.5rem 0; padding-left: 1.5rem; }',
		'li { font-size: 0.9rem; margin-bottom: 0.3rem; }',
		'.badge, .section-badge { display: inline-block; padding: 0.2rem 0.6rem; background: rgba(139, 92, 246, 0.3); border-radius: 1rem; font-size: 0.7rem; margin-bottom: 0.5rem; }',
		'.highlight { color: #a78bfa; }',
		'.stats { display: flex; gap: 1rem; justify-content: center; margin-top: 0.5rem; }',
		'.stat { text-align: center; }',
		'.stat-value { font-size: 1.5rem; font-weight: 700; color: #a78bfa; }',
		'.stat-label { font-size: 0.7rem; opacity: 0.7; }',
		'.grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.75rem; margin-top: 0.75rem; }',
		'.card { background: rgba(255,255,255,0.05); padding: 0.75rem; border-radius: 0.5rem; }',
		'.card-num { color: #a78bfa; font-weight: 700; font-size: 0.85rem; }',
		'.card-title { font-weight: 600; font-size: 0.8rem; margin-top: 0.25rem; }',
		'.card-desc { font-size: 0.7rem; color: #a1a1aa; margin-top: 0.15rem; }',
		'.conclusion { background: rgba(139, 92, 246, 0.1); padding: 0.75rem; border-radius: 0.5rem; margin-top: 0.75rem; }'
	].join(' ');

	// Build tags dynamically to avoid PostCSS issues
	const STYLE_OPEN = '<' + 'style>';
	const STYLE_CLOSE = '</' + 'style>';

	// Parse slides from HTML content
	function parseSlides(html: string): string[] {
		if (!html) return [];
		
		const tempDiv = document.createElement('div');
		tempDiv.innerHTML = html;

		const slideElements = tempDiv.querySelectorAll('.slide, section.slide, [data-slide]');
		
		if (slideElements.length > 0) {
			return Array.from(slideElements).map(s => s.outerHTML);
		}

		return [html];
	}

	// Generate HTML for a single slide iframe
	function generateSlideHTML(slideContent: string): string {
		// Build the HTML document for the iframe
		const styleTagRegex = new RegExp(STYLE_OPEN.replace(/[<>]/g, '\\$&') + '([\\s\\S]*?)' + STYLE_CLOSE.replace(/[<>/]/g, '\\$&'), 'i');
		const styleMatch = content.match(styleTagRegex);
		const extraStyles = styleMatch ? styleMatch[1] : '';
		
		return '<!DOCTYPE html><html><head><meta charset="utf-8">' + 
			STYLE_OPEN + SLIDE_CSS + ' ' + extraStyles + STYLE_CLOSE +
			'</head><body><div class="slide-wrapper">' + 
			slideContent + 
			'</div></body></html>';
	}

	$: if (content) {
		slides = parseSlides(content);
	}

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
		a.download = (title || 'presentation') + '.html';
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

<div class="slides-viewer flex flex-col h-full bg-gray-900" transition:fade={{ duration: 150 }}>
	<div class="flex items-center justify-between px-3 py-2 bg-gray-800 border-b border-gray-700 flex-shrink-0">
		<div class="flex items-center gap-2">
			<svg class="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
					d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
			</svg>
			<span class="text-xs font-medium text-white truncate">
				{title || $i18n.t('Presentation')}
			</span>
			{#if slides.length > 0}
				<span class="text-xs text-gray-400">({slides.length} slides)</span>
			{/if}
		</div>

		<div class="flex items-center gap-0.5">
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

			<button
				class="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
				on:click={downloadSlides}
				title={$i18n.t('Download')}
			>
				<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
						d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
				</svg>
			</button>
		</div>
	</div>

	<div 
		bind:this={containerElement}
		class="flex-1 overflow-y-auto p-3 space-y-3 bg-gray-950"
	>
		{#if slides.length === 0}
			<div class="flex items-center justify-center h-full text-gray-500 text-sm">
				{$i18n.t('Generating presentation...')}
			</div>
		{:else}
			{#each slides as slide, idx}
				<div class="slide-container" transition:fade={{ duration: 200, delay: idx * 50 }}>
					<div class="slide-number text-xs text-gray-500 mb-1 px-1">
						Slide {idx + 1}
					</div>
					<div class="slide-frame rounded-lg overflow-hidden shadow-lg border border-gray-800">
						<iframe
							title="Slide {idx + 1}"
							srcdoc={generateSlideHTML(slide)}
							class="w-full border-0"
							sandbox="allow-scripts"
						></iframe>
					</div>
				</div>
			{/each}
		{/if}
	</div>
</div>

<style>
	.slides-viewer {
		min-height: 300px;
	}
	
	.slide-frame {
		aspect-ratio: 16 / 9;
		background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
	}
	
	.slide-frame iframe {
		height: 100%;
	}
</style>
