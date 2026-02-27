<script lang="ts">
	import { getContext, onMount } from 'svelte';
	import type { Writable } from 'svelte/store';
	import type { i18n as i18nType } from 'i18next';
	import {
		showWorkspaceBrowser,
		showControls,
		brainArtifact,
		showBrainArtifact,
		showArtifacts
	} from '$lib/stores';
	import { listWorkspaceFiles, getWorkspaceFileUrl } from '$lib/apis/brain';
	import type { WorkspaceFile } from '$lib/apis/brain';

	const i18n = getContext<Writable<i18nType>>('i18n');

	let token = '';
	let currentPath = '';
	let pathHistory: string[] = [''];
	let files: WorkspaceFile[] = [];
	let loading = false;
	let error = '';

	onMount(() => {
		const stored = localStorage.getItem('token');
		if (stored) token = stored;
		loadDirectory('');
	});

	async function loadDirectory(path: string) {
		loading = true;
		error = '';
		try {
			const result = await listWorkspaceFiles(token, path);
			files = result.files || [];
			currentPath = path;
		} catch (e: any) {
			error = e.message || 'Error loading workspace';
			files = [];
		} finally {
			loading = false;
		}
	}

	function navigateTo(name: string) {
		const newPath = currentPath ? `${currentPath}/${name}` : name;
		pathHistory = [...pathHistory, newPath];
		loadDirectory(newPath);
	}

	function goBack() {
		if (pathHistory.length > 1) {
			pathHistory = pathHistory.slice(0, -1);
			loadDirectory(pathHistory[pathHistory.length - 1]);
		}
	}

	function goHome() {
		pathHistory = [''];
		loadDirectory('');
	}

	function openFile(file: WorkspaceFile) {
		const filePath = currentPath ? `${currentPath}/${file.name}` : file.name;
		const ext = file.name.split('.').pop()?.toLowerCase() || '';

		const imageExts = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'];
		const videoExts = ['mp4', 'webm'];

		let artifactType: string = 'file';
		if (imageExts.includes(ext)) artifactType = 'image';
		else if (videoExts.includes(ext)) artifactType = 'video';
		else if (['html', 'htm'].includes(ext)) artifactType = 'website';
		else if (['xlsx', 'xls', 'csv'].includes(ext)) artifactType = 'spreadsheet';
		else if (['pptx', 'ppt'].includes(ext)) artifactType = 'slides';
		else if (['md', 'txt', 'pdf'].includes(ext)) artifactType = 'document';

		const url = getWorkspaceFileUrl(filePath);

		brainArtifact.set({
			type: artifactType as any,
			content: url,
			title: file.name,
			format: 'url',
			metadata: { mime_type: getMimeType(ext), file_size: file.size }
		});
		showBrainArtifact.set(true);
		showArtifacts.set(true);
		showControls.set(true);
	}

	function getMimeType(ext: string): string {
		const map: Record<string, string> = {
			png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
			gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml',
			mp4: 'video/mp4', webm: 'video/webm',
			html: 'text/html', htm: 'text/html',
			xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
			csv: 'text/csv', pdf: 'application/pdf',
			md: 'text/markdown', txt: 'text/plain',
		};
		return map[ext] || 'application/octet-stream';
	}

	function downloadFile(file: WorkspaceFile) {
		const filePath = currentPath ? `${currentPath}/${file.name}` : file.name;
		const url = getWorkspaceFileUrl(filePath);
		const a = document.createElement('a');
		a.href = url;
		a.download = file.name;
		a.click();
	}

	function getFileIcon(file: WorkspaceFile): string {
		if (file.is_directory) return '📁';
		const ext = file.name.split('.').pop()?.toLowerCase() || '';
		const icons: Record<string, string> = {
			png: '🖼️', jpg: '🖼️', jpeg: '🖼️', gif: '🖼️', webp: '🖼️', svg: '🖼️',
			mp4: '🎬', webm: '🎬',
			xlsx: '📊', xls: '📊', csv: '📊',
			pptx: '📑', ppt: '📑',
			pdf: '📄', md: '📝', txt: '📝',
			py: '🐍', js: '📜', ts: '📜',
			html: '🌐', htm: '🌐',
		};
		return icons[ext] || '📎';
	}

	function formatSize(bytes: number): string {
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	}

	function close() {
		showWorkspaceBrowser.set(false);
		showControls.set(false);
	}
</script>

<div class="workspace-browser flex flex-col h-full bg-white dark:bg-gray-850">
	<!-- Header -->
	<div class="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-700">
		<div class="flex items-center gap-2">
			<button
				class="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 disabled:opacity-30"
				on:click={goBack}
				disabled={pathHistory.length <= 1}
			>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
				</svg>
			</button>
			<button
				class="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"
				on:click={goHome}
			>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
						d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
				</svg>
			</button>
			<span class="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[180px]">
				/{currentPath || ''}
			</span>
		</div>
		<button
			class="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"
			on:click={close}
		>
			<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
			</svg>
		</button>
	</div>

	<!-- Content -->
	<div class="flex-1 overflow-y-auto">
		{#if loading}
			<div class="flex items-center justify-center py-8 text-gray-400">
				<svg class="animate-spin w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24">
					<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
					<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
				</svg>
				{$i18n.t('Loading...')}
			</div>
		{:else if error}
			<div class="px-4 py-8 text-center text-red-400 text-sm">{error}</div>
		{:else if files.length === 0}
			<div class="px-4 py-8 text-center text-gray-400 text-sm">
				{$i18n.t('Empty directory')}
			</div>
		{:else}
			<div class="divide-y divide-gray-100 dark:divide-gray-800">
				{#each files.sort((a, b) => (b.is_directory ? 1 : 0) - (a.is_directory ? 1 : 0) || a.name.localeCompare(b.name)) as file}
					<button
						class="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left group"
						on:click={() => file.is_directory ? navigateTo(file.name) : openFile(file)}
					>
						<span class="text-base flex-shrink-0">{getFileIcon(file)}</span>
						<div class="flex-1 min-w-0">
							<div class="text-sm text-gray-800 dark:text-gray-200 truncate">{file.name}</div>
							{#if !file.is_directory && file.size > 0}
								<div class="text-xs text-gray-400">{formatSize(file.size)}</div>
							{/if}
						</div>
						{#if !file.is_directory}
							<button
								class="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-400 transition-opacity"
								on:click|stopPropagation={() => downloadFile(file)}
								title={$i18n.t('Download')}
							>
								<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
										d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
								</svg>
							</button>
						{:else}
							<svg class="w-3.5 h-3.5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
							</svg>
						{/if}
					</button>
				{/each}
			</div>
		{/if}
	</div>

	<!-- Footer -->
	<div class="px-3 py-1.5 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-400 flex justify-between">
		<span>{files.length} {$i18n.t('items')}</span>
		<button
			class="hover:text-gray-600 dark:hover:text-gray-300"
			on:click={() => loadDirectory(currentPath)}
		>
			{$i18n.t('Refresh')}
		</button>
	</div>
</div>
