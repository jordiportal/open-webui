<script lang="ts">
	import { fade } from 'svelte/transition';
	import { getContext } from 'svelte';
	import type { Writable } from 'svelte/store';
	import type { i18n as i18nType } from 'i18next';
	import ViewerHeader from '../shared/ViewerHeader.svelte';

	const i18n = getContext<Writable<i18nType>>('i18n');

	export let content: string = '';
	export let title: string = '';
	export let format: 'url' | 'base64' | 'gallery' = 'url';

	interface ImageItem {
		src: string;
		alt?: string;
		caption?: string;
	}

	let images: ImageItem[] = [];
	let selectedIndex = 0;
	let scale = 1;
	let position = { x: 0, y: 0 };
	let isDragging = false;
	let dragStart = { x: 0, y: 0 };

	// Parse images from content
	$: {
		if (format === 'gallery') {
			try {
				const parsed = JSON.parse(content);
				images = Array.isArray(parsed) ? parsed : [parsed];
			} catch {
				images = [{ src: content }];
			}
		} else if (format === 'base64') {
			const mimeType = content.startsWith('/9j/') ? 'jpeg' : 'png';
			images = [{ src: 'data:image/' + mimeType + ';base64,' + content }];
		} else {
			images = [{ src: content }];
		}
	}

	$: currentImage = images[selectedIndex] || { src: '' };
	$: imageCount = images.length;

	function zoomIn() {
		scale = Math.min(scale + 0.25, 3);
	}

	function zoomOut() {
		scale = Math.max(scale - 0.25, 0.5);
	}

	function resetZoom() {
		scale = 1;
		position = { x: 0, y: 0 };
	}

	function handleWheel(e: WheelEvent) {
		e.preventDefault();
		if (e.deltaY < 0) {
			zoomIn();
		} else {
			zoomOut();
		}
	}

	function handleMouseDown(e: MouseEvent) {
		if (scale > 1) {
			isDragging = true;
			dragStart = { x: e.clientX - position.x, y: e.clientY - position.y };
		}
	}

	function handleMouseMove(e: MouseEvent) {
		if (isDragging) {
			position = { x: e.clientX - dragStart.x, y: e.clientY - dragStart.y };
		}
	}

	function handleMouseUp() {
		isDragging = false;
	}

	function selectImage(idx: number) {
		selectedIndex = idx;
		resetZoom();
	}

	function downloadImage() {
		const a = document.createElement('a');
		a.href = currentImage.src;
		a.download = title || 'image';
		a.click();
	}

	function openInNewTab() {
		window.open(currentImage.src, '_blank');
	}
</script>

<div class="image-viewer flex flex-col h-full bg-gray-900 rounded-lg overflow-hidden" transition:fade={{ duration: 150 }}>
	<ViewerHeader 
		title={title || currentImage.caption || $i18n.t('Image')}
		subtitle={imageCount > 1 ? (selectedIndex + 1) + '/' + imageCount : ''}
		icon="image" 
		iconColor="text-pink-400"
	>
		<svelte:fragment slot="actions">
			<button
				class="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
				on:click={zoomOut}
				title={$i18n.t('Zoom out')}
			>
				<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4" />
				</svg>
			</button>
			<span class="text-xs text-gray-400 px-1">{Math.round(scale * 100)}%</span>
			<button
				class="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
				on:click={zoomIn}
				title={$i18n.t('Zoom in')}
			>
				<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
				</svg>
			</button>
			<button
				class="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-white transition-colors ml-1"
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
				on:click={downloadImage}
				title={$i18n.t('Download')}
			>
				<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
						d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
				</svg>
			</button>
		</svelte:fragment>
	</ViewerHeader>

	<!-- Main image area -->
	<div 
		class="flex-1 overflow-hidden bg-gray-950 flex items-center justify-center relative"
		on:wheel={handleWheel}
		on:mousedown={handleMouseDown}
		on:mousemove={handleMouseMove}
		on:mouseup={handleMouseUp}
		on:mouseleave={handleMouseUp}
		role="img"
		style="cursor: {scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default'}"
	>
		{#if currentImage.src}
			<img
				src={currentImage.src}
				alt={currentImage.alt || title || 'Image'}
				class="max-w-full max-h-full object-contain select-none"
				style="transform: scale({scale}) translate({position.x / scale}px, {position.y / scale}px)"
				draggable="false"
			/>
		{:else}
			<div class="text-gray-500 text-sm">
				{$i18n.t('No image')}
			</div>
		{/if}
	</div>

	<!-- Thumbnail strip for gallery -->
	{#if imageCount > 1}
		<div class="flex gap-2 p-2 bg-gray-800 border-t border-gray-700 overflow-x-auto">
			{#each images as img, idx}
				<button
					class="flex-shrink-0 w-12 h-12 rounded overflow-hidden border-2 transition-colors
						{idx === selectedIndex ? 'border-purple-500' : 'border-transparent hover:border-gray-600'}"
					on:click={() => selectImage(idx)}
				>
					<img 
						src={img.src} 
						alt={img.alt || 'Thumbnail ' + (idx + 1)}
						class="w-full h-full object-cover"
					/>
				</button>
			{/each}
		</div>
	{/if}
</div>

<style>
	.image-viewer {
		min-height: 300px;
	}

	img {
		transition: transform 0.1s ease-out;
	}
</style>
