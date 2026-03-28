<script lang="ts">
	import type { Artifact, ArtifactPart } from '$lib/stores';

	import DocumentViewer from './viewers/DocumentViewer.svelte';
	import SlidesViewer from './viewers/SlidesViewer.svelte';
	import SpreadsheetViewer from './viewers/SpreadsheetViewer.svelte';
	import TerminalViewer from './viewers/TerminalViewer.svelte';
	import FilesViewer from './viewers/FilesViewer.svelte';
	import WebsiteViewer from './viewers/WebsiteViewer.svelte';
	import ImageViewer from './viewers/ImageViewer.svelte';
	import OnlyOfficeViewer from './viewers/OnlyOfficeViewer.svelte';

	export let artifact: Artifact;

	$: primaryPart = artifact.parts?.find((p: ArtifactPart) => p.kind === 'file') || artifact.parts?.[0];
	$: mimeType = primaryPart?.file?.mime_type || '';
	$: artMeta = artifact.metadata || {};

	$: isOffice = /vnd\.openxmlformats/.test(mimeType);
	$: isImage = mimeType.startsWith('image/');
	$: isVideo = mimeType.startsWith('video/');
	$: isSlides = primaryPart?.kind === 'text' && artMeta?.slides;

	$: fileUri = primaryPart?.file?.uri || '';
	$: proxyUrl = (() => {
		if (!fileUri) return '';
		if (fileUri.startsWith('sandbox://') && artifact.artifact_id) {
			return `/api/brain-proxy/artifacts/${artifact.artifact_id}/content`;
		}
		if (fileUri.startsWith('/api/brain-proxy/')) return fileUri;
		const stripped = fileUri.replace(/^\/+/, '');
		if (stripped.startsWith('api/brain-proxy/')) return `/${stripped}`;
		if (stripped.startsWith('workspace/')) {
			return `/api/brain-proxy/workspace/files/${stripped.replace(/^workspace\//, '')}`;
		}
		if (stripped.startsWith('api/v1/')) {
			return `/api/brain-proxy/${stripped.replace(/^api\/v1\//, '')}`;
		}
		return `/api/brain-proxy/${stripped}`;
	})();

	function extractFilePath(uri: string): string {
		const prefix = '/api/brain-proxy/workspace/files/';
		const idx = uri.indexOf(prefix);
		if (idx >= 0) return uri.slice(idx + prefix.length);
		const wfIdx = uri.indexOf('/workspace/files/');
		if (wfIdx >= 0) return uri.slice(wfIdx + '/workspace/files/'.length);
		return uri.replace(/^.*\/workspace\/files\//, '');
	}
</script>

<div class="artifact-viewer h-full">
	{#if isOffice && fileUri}
		<OnlyOfficeViewer
			filePath={extractFilePath(proxyUrl || fileUri)}
			title={artifact.name || ''}
		/>
	{:else if isImage && fileUri}
		<ImageViewer
			content={proxyUrl || fileUri}
			title={artifact.name}
			format="url"
		/>
	{:else if isVideo && fileUri}
		<WebsiteViewer
			content={proxyUrl || fileUri}
			title={artifact.name}
			format="url"
		/>
	{:else if isSlides && primaryPart?.text}
		<SlidesViewer
			content={primaryPart.text}
			title={artifact.name}
		/>
	{:else if primaryPart?.kind === 'text' && primaryPart?.text}
		<DocumentViewer
			content={primaryPart.text}
			title={artifact.name}
			format="html"
		/>
	{:else if primaryPart?.kind === 'file' && fileUri}
		<WebsiteViewer
			content={proxyUrl || fileUri}
			title={artifact.name}
			format="url"
		/>
	{:else if primaryPart?.kind === 'data'}
		<DocumentViewer
			content={JSON.stringify(primaryPart.data, null, 2)}
			title={artifact.name}
			format="html"
		/>
	{:else}
		<DocumentViewer
			content="No content available"
			title={artifact.name}
			format="html"
		/>
	{/if}
</div>

<style>
	.artifact-viewer {
		min-height: 100%;
	}
</style>
