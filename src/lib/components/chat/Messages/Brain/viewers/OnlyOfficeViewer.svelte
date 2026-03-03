<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { getOnlyOfficeConfig } from '$lib/apis/brain';

	export let filePath: string;
	export let title: string = '';

	let loading = true;
	let error: string | null = null;
	let editorId = `oo-editor-${Math.random().toString(36).slice(2, 8)}`;
	let editorInstance: any = null;

	onMount(async () => {
		const token = localStorage.getItem('token');
		if (!token) {
			error = 'No authentication token';
			loading = false;
			return;
		}

		try {
			const data = await getOnlyOfficeConfig(token, filePath);
			loading = false;

			await loadScript(data.api_url);

			setTimeout(() => {
				try {
					// @ts-ignore - DocsAPI loaded from external script
					editorInstance = new DocsAPI.DocEditor(editorId, data.config);
				} catch (err: any) {
					error = `Error initializing editor: ${err.message || err}`;
				}
			}, 100);
		} catch (err: any) {
			error = err.message || 'Failed to load OnlyOffice config';
			loading = false;
		}
	});

	onDestroy(() => {
		if (editorInstance?.destroyEditor) {
			try { editorInstance.destroyEditor(); } catch (_) {}
		}
	});

	function loadScript(url: string): Promise<void> {
		return new Promise((resolve, reject) => {
			if (document.querySelector(`script[src="${url}"]`)) {
				resolve();
				return;
			}
			const script = document.createElement('script');
			script.src = url;
			script.onload = () => resolve();
			script.onerror = () => reject(new Error('Failed to load OnlyOffice API script'));
			document.head.appendChild(script);
		});
	}
</script>

<div class="onlyoffice-viewer w-full h-full flex flex-col">
	{#if loading}
		<div class="flex items-center justify-center h-full text-gray-400">
			<svg class="animate-spin w-6 h-6 mr-2" fill="none" viewBox="0 0 24 24">
				<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
				<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
			</svg>
			<span>Loading {title || 'document'}...</span>
		</div>
	{:else if error}
		<div class="flex flex-col items-center justify-center h-full text-red-400 text-sm px-4 text-center">
			<svg class="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
					d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
			</svg>
			<p>{error}</p>
		</div>
	{:else}
		<div id={editorId} class="flex-1 w-full h-full" />
	{/if}
</div>

<style>
	.onlyoffice-viewer {
		min-height: 400px;
	}
</style>
