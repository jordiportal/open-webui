<script lang="ts">
	import { getContext, onMount, tick } from 'svelte';
	import type { Writable } from 'svelte/store';
	import type { i18n as i18nType } from 'i18next';
	import {
		showWorkspaceBrowser,
		showControls,
		brainArtifact,
		showBrainArtifact,
		showArtifacts
	} from '$lib/stores';
	import {
		listWorkspaceFiles,
		getWorkspaceFileUrl,
		getOnlyOfficeConfig,
		isOfficeFile,
		deleteWorkspaceFile,
		renameWorkspaceFile,
		moveWorkspaceFile,
		copyWorkspaceFile,
		createWorkspaceDirectory,
		uploadWorkspaceFile
	} from '$lib/apis/brain';
	import type { WorkspaceFile } from '$lib/apis/brain';

	const i18n = getContext<Writable<i18nType>>('i18n');

	let token = '';
	let currentPath = '';
	let pathHistory: string[] = [''];
	let files: WorkspaceFile[] = [];
	let loading = false;
	let error = '';

	// Context menu state
	let contextMenu: { x: number; y: number; file: WorkspaceFile } | null = null;

	// Modal state
	let modal: { type: 'rename' | 'move' | 'copy' | 'mkdir' | 'delete' | 'upload'; file?: WorkspaceFile } | null = null;
	let modalInput = '';
	let modalBusy = false;
	let modalError = '';

	// Upload
	let fileInputEl: HTMLInputElement;

	onMount(() => {
		const stored = localStorage.getItem('token');
		if (stored) token = stored;
		loadDirectory('');

		const dismiss = () => { contextMenu = null; };
		document.addEventListener('click', dismiss);
		return () => document.removeEventListener('click', dismiss);
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

	function filePath(file: WorkspaceFile): string {
		return currentPath ? `${currentPath}/${file.name}` : file.name;
	}

	// --- File actions ---

	function openFile(file: WorkspaceFile) {
		const fp = filePath(file);
		const ext = file.name.split('.').pop()?.toLowerCase() || '';

		if (isOfficeFile(file.name)) {
			openOfficeInNewWindow(fp, file.name);
			return;
		}

		const imageExts = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'];
		const videoExts = ['mp4', 'webm'];

		let artifactType: string = 'file';
		if (imageExts.includes(ext)) artifactType = 'image';
		else if (videoExts.includes(ext)) artifactType = 'video';
		else if (['html', 'htm'].includes(ext)) artifactType = 'website';
		else if (['md', 'txt', 'pdf'].includes(ext)) artifactType = 'document';

		const url = getWorkspaceFileUrl(fp);

		brainArtifact.set({
			type: artifactType as any,
			content: url,
			title: file.name,
			format: 'url',
			metadata: { mime_type: getMimeType(ext), file_size: file.size }
		});
		showWorkspaceBrowser.set(false);
		showBrainArtifact.set(true);
		showArtifacts.set(true);
		showControls.set(true);
	}

	async function openOfficeInNewWindow(fp: string, fileName: string) {
		const win = window.open('', '_blank');
		if (!win) return;

		win.document.open();
		win.document.write(`<!DOCTYPE html>
<html style="height:100%;margin:0">
<head><meta charset="utf-8"><title>${fileName}</title></head>
<body style="height:100%;margin:0;overflow:hidden">
<div id="placeholder" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-family:system-ui;color:#888;font-size:14px">Cargando ${fileName}...</div>
<div id="editor" style="position:absolute;inset:0"></div>
</body></html>`);
		win.document.close();

		try {
			const data = await getOnlyOfficeConfig(token, fp);
			const script = win.document.createElement('script');
			script.src = data.api_url;
			script.onload = () => {
				const ph = win.document.getElementById('placeholder');
				if (ph) ph.remove();
				new (win as any).DocsAPI.DocEditor('editor', { ...data.config, width: '100%', height: '100%' });
			};
			script.onerror = () => {
				const ph = win.document.getElementById('placeholder');
				if (ph) ph.textContent = 'Error al cargar OnlyOffice';
			};
			win.document.head.appendChild(script);
		} catch (e: any) {
			const ph = win.document.getElementById('placeholder');
			if (ph) ph.textContent = `Error: ${e.message}`;
		}
	}

	function downloadFile(file: WorkspaceFile) {
		const url = getWorkspaceFileUrl(filePath(file));
		const a = document.createElement('a');
		a.href = url;
		a.download = file.name;
		a.click();
	}

	// --- Context menu ---

	function onContextMenu(e: MouseEvent, file: WorkspaceFile) {
		e.preventDefault();
		const container = (e.currentTarget as HTMLElement).closest('.workspace-browser') as HTMLElement;
		if (!container) return;
		const rect = container.getBoundingClientRect();

		const menuW = 170;
		const menuH = file.is_directory ? 160 : 220;

		let x = e.clientX - rect.left;
		let y = e.clientY - rect.top;

		if (x + menuW > rect.width) x = rect.width - menuW - 4;
		if (y + menuH > rect.height) y = rect.height - menuH - 4;
		if (x < 4) x = 4;
		if (y < 4) y = 4;

		contextMenu = { x, y, file };
	}

	// --- Modal actions ---

	function openModal(type: typeof modal extends null ? never : NonNullable<typeof modal>['type'], file?: WorkspaceFile) {
		contextMenu = null;
		modalError = '';
		modalBusy = false;

		if (type === 'rename' && file) {
			modalInput = file.name;
		} else if (type === 'copy' && file) {
			const base = file.name.replace(/(\.[^.]+)$/, '');
			const ext = file.name.includes('.') ? file.name.slice(file.name.lastIndexOf('.')) : '';
			modalInput = currentPath ? `${currentPath}/${base}_copy${ext}` : `${base}_copy${ext}`;
		} else if (type === 'move' && file) {
			modalInput = currentPath;
		} else {
			modalInput = '';
		}

		modal = { type, file };
		tick().then(() => {
			const inp = document.getElementById('modal-input') as HTMLInputElement;
			if (inp) { inp.focus(); inp.select(); }
		});
	}

	async function confirmModal() {
		if (!modal || modalBusy) return;
		modalBusy = true;
		modalError = '';

		try {
			const fp = modal.file ? filePath(modal.file) : '';

			switch (modal.type) {
				case 'rename':
					if (!modalInput.trim()) throw new Error('Nombre requerido');
					await renameWorkspaceFile(token, fp, modalInput.trim());
					break;
				case 'move':
					await moveWorkspaceFile(token, fp, modalInput.trim());
					break;
				case 'copy':
					if (!modalInput.trim()) throw new Error('Destino requerido');
					await copyWorkspaceFile(token, fp, modalInput.trim());
					break;
				case 'mkdir':
					if (!modalInput.trim()) throw new Error('Nombre requerido');
					const dirPath = currentPath ? `${currentPath}/${modalInput.trim()}` : modalInput.trim();
					await createWorkspaceDirectory(token, dirPath);
					break;
				case 'delete':
					await deleteWorkspaceFile(token, fp);
					break;
			}

			modal = null;
			await loadDirectory(currentPath);
		} catch (e: any) {
			modalError = e.message || 'Error';
		} finally {
			modalBusy = false;
		}
	}

	async function handleUpload(e: Event) {
		const input = e.target as HTMLInputElement;
		const fileList = input.files;
		if (!fileList || fileList.length === 0) return;

		loading = true;
		try {
			for (const f of Array.from(fileList)) {
				await uploadWorkspaceFile(token, f, currentPath || '.');
			}
			await loadDirectory(currentPath);
		} catch (e: any) {
			error = e.message || 'Upload failed';
		} finally {
			loading = false;
			input.value = '';
		}
	}

	function onModalKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') confirmModal();
		if (e.key === 'Escape') modal = null;
	}

	// --- Helpers ---

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

	$: modalTitle = modal?.type === 'rename' ? 'Renombrar'
		: modal?.type === 'move' ? 'Mover a'
		: modal?.type === 'copy' ? 'Copiar a'
		: modal?.type === 'mkdir' ? 'Nueva carpeta'
		: modal?.type === 'delete' ? 'Eliminar'
		: '';
</script>

<div class="workspace-browser relative flex flex-col h-full bg-white dark:bg-gray-850">
	<!-- Header -->
	<div class="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-700">
		<div class="flex items-center gap-1.5">
			<button
				class="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 disabled:opacity-30"
				on:click={goBack}
				disabled={pathHistory.length <= 1}
				title={$i18n.t('Back')}
			>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
				</svg>
			</button>
			<button
				class="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"
				on:click={goHome}
				title={$i18n.t('Home')}
			>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
						d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
				</svg>
			</button>
			<span class="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[120px]">
				/{currentPath || ''}
			</span>
		</div>
		<div class="flex items-center gap-0.5">
			<button
				class="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"
				on:click={() => openModal('mkdir')}
				title={$i18n.t('New folder')}
			>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
						d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
				</svg>
			</button>
			<button
				class="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"
				on:click={() => fileInputEl?.click()}
				title={$i18n.t('Upload')}
			>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
						d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
				</svg>
			</button>
			<button
				class="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"
				on:click={close}
				title={$i18n.t('Close')}
			>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
				</svg>
			</button>
		</div>
	</div>

	<input bind:this={fileInputEl} type="file" multiple class="hidden" on:change={handleUpload} />

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
					<!-- svelte-ignore a11y-click-events-have-key-events -->
					<!-- svelte-ignore a11y-no-static-element-interactions -->
					<div
						class="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left group cursor-pointer"
						on:click={() => file.is_directory ? navigateTo(file.name) : openFile(file)}
						on:contextmenu={(e) => onContextMenu(e, file)}
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
							<svg class="w-3.5 h-3.5 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
							</svg>
						{/if}
						<button
							class="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-400 transition-opacity"
							on:click|stopPropagation={(e) => onContextMenu(e, file)}
							title={$i18n.t('More')}
						>
							<svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
								<path d="M10 6a2 2 0 110-4 2 2 0 010 4zm0 6a2 2 0 110-4 2 2 0 010 4zm0 6a2 2 0 110-4 2 2 0 010 4z" />
							</svg>
						</button>
					</div>
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

	<!-- Context Menu -->
	{#if contextMenu}
		<div
			class="context-menu absolute z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-[160px]"
			style="left:{contextMenu.x}px;top:{contextMenu.y}px"
		>
			{#if !contextMenu.file.is_directory}
				<button class="ctx-item" on:click={() => { openFile(contextMenu.file); contextMenu = null; }}>
					<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
					Abrir
				</button>
				<button class="ctx-item" on:click={() => { downloadFile(contextMenu.file); contextMenu = null; }}>
					<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
					Descargar
				</button>
				<div class="border-t border-gray-100 dark:border-gray-700 my-1"></div>
			{/if}
			<button class="ctx-item" on:click={() => openModal('rename', contextMenu.file)}>
				<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
				Renombrar
			</button>
			<button class="ctx-item" on:click={() => openModal('move', contextMenu.file)}>
				<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
				Mover a...
			</button>
			<button class="ctx-item" on:click={() => openModal('copy', contextMenu.file)}>
				<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
				Copiar
			</button>
			<div class="border-t border-gray-100 dark:border-gray-700 my-1"></div>
			<button class="ctx-item text-red-500 dark:text-red-400" on:click={() => openModal('delete', contextMenu.file)}>
				<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
				Eliminar
			</button>
		</div>
	{/if}

	<!-- Modal Overlay -->
	{#if modal}
		<!-- svelte-ignore a11y-click-events-have-key-events -->
		<!-- svelte-ignore a11y-no-static-element-interactions -->
		<div
			class="absolute inset-0 z-50 bg-black/30 flex items-center justify-center p-4"
			on:click|self={() => { modal = null; }}
		>
			<div class="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-sm p-4" on:keydown={onModalKeydown}>
				<h3 class="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">{modalTitle}</h3>

				{#if modal.type === 'delete'}
					<p class="text-sm text-gray-600 dark:text-gray-400 mb-1">
						¿Eliminar <strong>{modal.file?.name}</strong>?
					</p>
					<p class="text-xs text-gray-400 mb-4">Esta acción no se puede deshacer.</p>
				{:else if modal.type === 'rename'}
					<label class="text-xs text-gray-500 dark:text-gray-400 block mb-1">Nuevo nombre</label>
					<input
						id="modal-input"
						type="text"
						class="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
						bind:value={modalInput}
					/>
				{:else if modal.type === 'move'}
					<label class="text-xs text-gray-500 dark:text-gray-400 block mb-1">Carpeta destino (ruta)</label>
					<input
						id="modal-input"
						type="text"
						placeholder="uploads/docs"
						class="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
						bind:value={modalInput}
					/>
				{:else if modal.type === 'copy'}
					<label class="text-xs text-gray-500 dark:text-gray-400 block mb-1">Ruta de destino</label>
					<input
						id="modal-input"
						type="text"
						class="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
						bind:value={modalInput}
					/>
				{:else if modal.type === 'mkdir'}
					<label class="text-xs text-gray-500 dark:text-gray-400 block mb-1">Nombre de la carpeta</label>
					<input
						id="modal-input"
						type="text"
						placeholder="nueva-carpeta"
						class="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
						bind:value={modalInput}
					/>
				{/if}

				{#if modalError}
					<p class="text-xs text-red-500 mt-2">{modalError}</p>
				{/if}

				<div class="flex justify-end gap-2 mt-4">
					<button
						class="px-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
						on:click={() => { modal = null; }}
					>
						Cancelar
					</button>
					<button
						class="px-3 py-1.5 text-xs rounded-lg text-white transition disabled:opacity-50
							{modal.type === 'delete' ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600'}"
						on:click={confirmModal}
						disabled={modalBusy}
					>
						{#if modalBusy}
							<svg class="animate-spin w-3 h-3 inline mr-1" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
						{/if}
						{modal.type === 'delete' ? 'Eliminar' : 'Confirmar'}
					</button>
				</div>
			</div>
		</div>
	{/if}
</div>

<style>
	.ctx-item {
		display: flex;
		align-items: center;
		gap: 8px;
		width: 100%;
		padding: 6px 12px;
		font-size: 13px;
		text-align: left;
		transition: background-color 0.1s;
		cursor: pointer;
		border: none;
		background: none;
		color: inherit;
	}
	.ctx-item:hover {
		background-color: rgba(0, 0, 0, 0.05);
	}
	:global(.dark) .ctx-item:hover {
		background-color: rgba(255, 255, 255, 0.08);
	}
</style>
