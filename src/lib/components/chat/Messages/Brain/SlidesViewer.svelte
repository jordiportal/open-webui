<script lang="ts">
	import { fade, slide } from 'svelte/transition';
	import { createEventDispatcher, getContext, onMount, tick } from 'svelte';
	import type { Writable } from 'svelte/store';
	import type { i18n as i18nType } from 'i18next';
	import { copyToClipboard } from '$lib/utils';
	import { toast } from 'svelte-sonner';

	const i18n = getContext<Writable<i18nType>>('i18n');
	const dispatch = createEventDispatcher();

	export let content: string = '';
	export let title: string = '';
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	export let format: string = 'html'; // Reserved for future format support

	let iframeElement: HTMLIFrameElement;
	let currentSlide = 0;
	let totalSlides = 0;
	let isFullscreen = false;
	let slidesParsed: string[] = [];

	// Parse slides from HTML content
	function parseSlides(html: string): string[] {
		// Try to detect slide separators
		// Common patterns: <section>, <div class="slide">, <!-- slide -->, ---
		
		const tempDiv = document.createElement('div');
		tempDiv.innerHTML = html;

		// Check for section elements (reveal.js style)
		let sections = tempDiv.querySelectorAll('section.slide, section[data-slide], .slide');
		if (sections.length > 0) {
			return Array.from(sections).map(s => s.outerHTML);
		}

		// Check for slide divs
		sections = tempDiv.querySelectorAll('div.slide, div[data-slide-index]');
		if (sections.length > 0) {
			return Array.from(sections).map(s => s.outerHTML);
		}

		// If no slide markers found, treat entire content as one slide
		return [html];
	}

	// Generate full HTML document for iframe
	function generateSlideHTML(slideContent: string): string {
		return `
<!DOCTYPE html>
<html>
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<style>
		* { box-sizing: border-box; margin: 0; padding: 0; }
		html, body { 
			height: 100%; 
			font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
			background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
			color: white;
			overflow: hidden;
		}
		body {
			display: flex;
			align-items: center;
			justify-content: center;
			padding: 2rem;
		}
		.slide-content {
			max-width: 100%;
			max-height: 100%;
			text-align: center;
		}
		h1, h2, h3 { margin-bottom: 1rem; }
		h1 { font-size: 2.5rem; font-weight: 700; }
		h2 { font-size: 2rem; font-weight: 600; }
		h3 { font-size: 1.5rem; font-weight: 500; }
		p { font-size: 1.25rem; line-height: 1.6; margin-bottom: 1rem; }
		ul, ol { text-align: left; margin: 1rem auto; max-width: 80%; }
		li { font-size: 1.1rem; margin-bottom: 0.5rem; }
		code { 
			background: rgba(255,255,255,0.1); 
			padding: 0.2rem 0.5rem; 
			border-radius: 4px;
			font-family: 'Fira Code', monospace;
		}
		pre {
			background: rgba(0,0,0,0.3);
			padding: 1rem;
			border-radius: 8px;
			overflow-x: auto;
			text-align: left;
		}
		img { max-width: 100%; max-height: 60vh; border-radius: 8px; }
		a { color: #64b5f6; }
	</style>
</head>
<body>
	<div class="slide-content">
		${slideContent}
	</div>
</body>
</html>`;
	}

	let mounted = false;

	onMount(() => {
		mounted = true;
		if (content) {
			slidesParsed = parseSlides(content);
			totalSlides = slidesParsed.length;
			// Use tick to ensure iframe is bound
			tick().then(() => updateIframe());
		}
	});

	$: if (content && mounted) {
		slidesParsed = parseSlides(content);
		totalSlides = slidesParsed.length;
		if (currentSlide >= totalSlides) {
			currentSlide = Math.max(0, totalSlides - 1);
		}
		// Use tick to ensure DOM is ready
		tick().then(() => updateIframe());
	}

	function updateIframe() {
		if (iframeElement && slidesParsed.length > 0) {
			const slideHTML = generateSlideHTML(slidesParsed[currentSlide] || '');
			console.log('Updating iframe with slide', currentSlide, 'content length:', slideHTML.length);
			iframeElement.srcdoc = slideHTML;
		} else {
			console.log('Cannot update iframe:', { hasElement: !!iframeElement, slidesCount: slidesParsed.length });
		}
	}

	function nextSlide() {
		if (currentSlide < totalSlides - 1) {
			currentSlide++;
			updateIframe();
		}
	}

	function prevSlide() {
		if (currentSlide > 0) {
			currentSlide--;
			updateIframe();
		}
	}

	function goToSlide(index: number) {
		if (index >= 0 && index < totalSlides) {
			currentSlide = index;
			updateIframe();
		}
	}

	function toggleFullscreen() {
		if (iframeElement) {
			if (!document.fullscreenElement) {
				iframeElement.requestFullscreen();
				isFullscreen = true;
			} else {
				document.exitFullscreen();
				isFullscreen = false;
			}
		}
	}

	function downloadSlides() {
		const blob = new Blob([content], { type: 'text/html' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `${title || 'slides'}.html`;
		a.click();
		URL.revokeObjectURL(url);
		toast.success($i18n.t('Downloaded'));
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'ArrowRight' || e.key === ' ') {
			nextSlide();
		} else if (e.key === 'ArrowLeft') {
			prevSlide();
		} else if (e.key === 'f') {
			toggleFullscreen();
		}
	}
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="slides-viewer flex flex-col h-full bg-gray-900 rounded-xl overflow-hidden">
	<!-- Header -->
	<div class="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
		<div class="flex items-center gap-2">
			<svg class="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
					d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
			</svg>
			<span class="text-sm font-medium text-white truncate">
				{title || $i18n.t('Presentation')}
			</span>
		</div>

		<div class="flex items-center gap-2">
			<!-- Slide counter -->
			<span class="text-sm text-gray-400">
				{currentSlide + 1} / {totalSlides}
			</span>

			<!-- Fullscreen -->
			<button
				class="p-1.5 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
				on:click={toggleFullscreen}
				title={$i18n.t('Fullscreen')}
			>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
						d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
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

	<!-- Slide content -->
	<div class="flex-1 relative bg-gray-900">
		<iframe
			bind:this={iframeElement}
			class="w-full h-full border-0"
			title="Slide"
			sandbox="allow-scripts"
		></iframe>

		<!-- Navigation arrows -->
		{#if totalSlides > 1}
			<button
				class="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
				on:click={prevSlide}
				disabled={currentSlide === 0}
				aria-label={$i18n.t('Previous slide')}
			>
				<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
				</svg>
			</button>

			<button
				class="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
				on:click={nextSlide}
				disabled={currentSlide === totalSlides - 1}
				aria-label={$i18n.t('Next slide')}
			>
				<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
				</svg>
			</button>
		{/if}
	</div>

	<!-- Thumbnail navigation -->
	{#if totalSlides > 1}
		<div class="flex items-center gap-2 px-4 py-2 bg-gray-800 border-t border-gray-700 overflow-x-auto">
			{#each slidesParsed as _, idx}
				<button
					class="flex-shrink-0 w-16 h-10 rounded border-2 transition-all
						{currentSlide === idx 
							? 'border-blue-500 bg-blue-500/20' 
							: 'border-gray-600 hover:border-gray-500 bg-gray-700'}"
					on:click={() => goToSlide(idx)}
				>
					<span class="text-xs text-gray-300">{idx + 1}</span>
				</button>
			{/each}
		</div>
	{/if}
</div>
