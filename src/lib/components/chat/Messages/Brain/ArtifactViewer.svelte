<script lang="ts">
	import type { BrainArtifact } from '$lib/stores';
	
	// Import all viewers
	import DocumentViewer from './viewers/DocumentViewer.svelte';
	import SlidesViewer from './viewers/SlidesViewer.svelte';
	import SpreadsheetViewer from './viewers/SpreadsheetViewer.svelte';
	import TerminalViewer from './viewers/TerminalViewer.svelte';
	import FilesViewer from './viewers/FilesViewer.svelte';
	import WebsiteViewer from './viewers/WebsiteViewer.svelte';
	import ImageViewer from './viewers/ImageViewer.svelte';

	export let artifact: BrainArtifact;

	// Extract metadata with defaults
	$: metadata = artifact.metadata || {};
	$: format = artifact.format || 'html';
</script>

<div class="artifact-viewer h-full">
	{#if artifact.type === 'document'}
		<DocumentViewer 
			content={artifact.content}
			title={artifact.title}
			format={format === 'markdown' ? 'markdown' : 'html'}
		/>
	{:else if artifact.type === 'slides'}
		<SlidesViewer 
			content={artifact.content}
			title={artifact.title}
		/>
	{:else if artifact.type === 'spreadsheet'}
		<SpreadsheetViewer 
			content={artifact.content}
			title={artifact.title}
			format={format === 'csv' ? 'csv' : 'json'}
			columns={metadata.columns || []}
		/>
	{:else if artifact.type === 'terminal'}
		<TerminalViewer 
			content={artifact.content}
			title={artifact.title}
			command={metadata.command || ''}
			exitCode={metadata.exitCode ?? null}
			cwd={metadata.cwd || ''}
		/>
	{:else if artifact.type === 'files'}
		<FilesViewer 
			content={artifact.content}
			title={artifact.title}
			basePath={metadata.basePath || ''}
		/>
	{:else if artifact.type === 'website'}
		<WebsiteViewer 
			content={artifact.content}
			title={artifact.title}
			format={format === 'url' ? 'url' : 'html'}
		/>
	{:else if artifact.type === 'image'}
		<ImageViewer 
			content={artifact.content}
			title={artifact.title}
			format={format === 'base64' ? 'base64' : format === 'gallery' ? 'gallery' : 'url'}
		/>
	{:else}
		<!-- Fallback for unknown types - try to render as document -->
		<DocumentViewer 
			content={artifact.content}
			title={artifact.title}
			format="html"
		/>
	{/if}
</div>

<style>
	.artifact-viewer {
		min-height: 100%;
	}
</style>
