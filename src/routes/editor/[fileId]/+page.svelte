<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { getOnlyOfficeConfig } from '$lib/apis/slides';
	import { WEBUI_API_BASE_URL } from '$lib/constants';

	let loading = true;
	let error: string | null = null;
	let editorConfig: any = null;
	let apiUrl: string | null = null;

	onMount(async () => {
		const fileId = $page.params.fileId;
		const token = localStorage.getItem('token');

		if (!token) {
			error = 'No se encontró token de autenticación';
			loading = false;
			return;
		}

		try {
			const response = await getOnlyOfficeConfig(token, fileId);

			if (!response.enabled) {
				error = response.error || 'OnlyOffice no está habilitado';
				loading = false;
				return;
			}

			editorConfig = response.config;
			apiUrl = response.api_url;
			loading = false;

			// Initialize editor after DOM is ready
			setTimeout(() => {
				initEditor();
			}, 100);
		} catch (err) {
			error = err instanceof Error ? err.message : String(err);
			loading = false;
		}
	});

	function initEditor() {
		if (!editorConfig || !apiUrl) return;

		// Load OnlyOffice API script dynamically
		const script = document.createElement('script');
		script.src = apiUrl;
		script.onload = () => {
			try {
				// @ts-ignore - DocsAPI is loaded from external script
				new DocsAPI.DocEditor('onlyoffice-editor', editorConfig);
			} catch (err) {
				error = 'Error al inicializar el editor: ' + (err instanceof Error ? err.message : String(err));
			}
		};
		script.onerror = () => {
			error = 'Error al cargar la API de OnlyOffice. Verifica que el servidor esté accesible.';
		};
		document.head.appendChild(script);
	}
</script>

<svelte:head>
	<title>Editor - OnlyOffice</title>
	<style>
		html, body {
			margin: 0;
			padding: 0;
			height: 100%;
			overflow: hidden;
		}
	</style>
</svelte:head>

<div class="editor-container">
	{#if loading}
		<div class="loading">
			<div class="spinner"></div>
			<p>Cargando editor...</p>
		</div>
	{:else if error}
		<div class="error">
			<h2>Error</h2>
			<p>{error}</p>
			<button on:click={() => window.close()}>Cerrar</button>
		</div>
	{:else}
		<div id="onlyoffice-editor"></div>
	{/if}
</div>

<style>
	.editor-container {
		width: 100vw;
		height: 100vh;
		margin: 0;
		padding: 0;
	}

	#onlyoffice-editor {
		width: 100%;
		height: 100%;
	}

	.loading, .error {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 100%;
		font-family: system-ui, -apple-system, sans-serif;
		color: #666;
	}

	.error {
		color: #dc2626;
	}

	.error h2 {
		margin-bottom: 0.5rem;
	}

	.error button {
		margin-top: 1rem;
		padding: 0.5rem 1rem;
		background: #3b82f6;
		color: white;
		border: none;
		border-radius: 0.375rem;
		cursor: pointer;
	}

	.error button:hover {
		background: #2563eb;
	}

	.spinner {
		width: 40px;
		height: 40px;
		border: 3px solid #e5e7eb;
		border-top-color: #3b82f6;
		border-radius: 50%;
		animation: spin 1s linear infinite;
		margin-bottom: 1rem;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}
</style>
