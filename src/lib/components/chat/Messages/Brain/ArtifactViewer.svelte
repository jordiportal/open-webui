<script lang="ts">
	import type { BrainArtifact } from '$lib/stores';
	import { isOfficeFile } from '$lib/apis/brain';
	
	// Import all viewers
	import DocumentViewer from './viewers/DocumentViewer.svelte';
	import SlidesViewer from './viewers/SlidesViewer.svelte';
	import SpreadsheetViewer from './viewers/SpreadsheetViewer.svelte';
	import TerminalViewer from './viewers/TerminalViewer.svelte';
	import FilesViewer from './viewers/FilesViewer.svelte';
	import WebsiteViewer from './viewers/WebsiteViewer.svelte';
	import ImageViewer from './viewers/ImageViewer.svelte';
	import OnlyOfficeViewer from './viewers/OnlyOfficeViewer.svelte';

	export let artifact: BrainArtifact;

	$: metadata = artifact.metadata || {};
	$: format = artifact.format || 'html';
	$: isUrlArtifact = format === 'url';
	$: mimeType = metadata.mime_type || '';
	$: urlIsImage = isUrlArtifact && (artifact.type === 'image' || mimeType.startsWith('image/'));
	$: urlIsVideo = isUrlArtifact && (artifact.type === 'video' || mimeType.startsWith('video/'));
	$: urlIsOffice = isUrlArtifact && isOfficeFile(artifact.title || '');
	$: officeFilePath = urlIsOffice ? extractFilePath(artifact.content) : '';

	function extractFilePath(url: string): string {
		const prefix = '/api/brain-proxy/workspace/files/';
		const idx = url.indexOf(prefix);
		if (idx >= 0) return url.slice(idx + prefix.length);
		return url.replace(/^.*\/workspace\/files\//, '');
	}
</script>

<div class="artifact-viewer h-full">
	{#if isUrlArtifact}
		<!-- URL-based artifact: route by mime_type or artifact_type -->
		{#if urlIsOffice}
			<OnlyOfficeViewer
				filePath={officeFilePath}
				title={artifact.title || ''}
			/>
		{:else if urlIsImage}
			<ImageViewer 
				content={artifact.content}
				title={artifact.title}
				format="url"
			/>
		{:else if urlIsVideo}
			<WebsiteViewer
				content={artifact.content}
				title={artifact.title}
				format="url"
			/>
		{:else if artifact.type === 'spreadsheet'}
			<WebsiteViewer
				content={artifact.content}
				title={artifact.title}
				format="url"
			/>
		{:else if artifact.type === 'slides'}
			<WebsiteViewer
				content={artifact.content}
				title={artifact.title}
				format="url"
			/>
		{:else}
			<WebsiteViewer
				content={artifact.content}
				title={artifact.title}
				format="url"
			/>
		{/if}
	{:else if artifact.type === 'document'}
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
