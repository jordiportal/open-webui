<script lang="ts">
	import { fade } from 'svelte/transition';
	import { getContext } from 'svelte';
	import type { Writable } from 'svelte/store';
	import type { i18n as i18nType } from 'i18next';
	import ViewerHeader from '../shared/ViewerHeader.svelte';

	const i18n = getContext<Writable<i18nType>>('i18n');

	export let content: string = '';
	export let title: string = '';
	export let basePath: string = '';

	interface FileItem {
		name: string;
		path: string;
		type: 'file' | 'folder';
		size?: number;
		modified?: string;
		children?: FileItem[];
	}

	let files: FileItem[] = [];
	let expandedFolders: Set<string> = new Set();
	let parseError = '';

	// Parse files from JSON content
	$: {
		parseError = '';
		try {
			const data = JSON.parse(content);
			files = data.files || data || [];
		} catch (e) {
			parseError = e instanceof Error ? e.message : 'Parse error';
			files = [];
		}
	}

	function toggleFolder(path: string) {
		if (expandedFolders.has(path)) {
			expandedFolders.delete(path);
		} else {
			expandedFolders.add(path);
		}
		expandedFolders = expandedFolders;
	}

	function formatSize(bytes?: number): string {
		if (bytes === undefined) return '';
		if (bytes < 1024) return bytes + ' B';
		if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
		if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
		return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
	}

	function getFileIcon(file: FileItem): string {
		if (file.type === 'folder') return 'folder';
		
		const ext = file.name.split('.').pop()?.toLowerCase() || '';
		const iconMap: Record<string, string> = {
			pdf: 'pdf',
			doc: 'doc', docx: 'doc',
			xls: 'xls', xlsx: 'xls', csv: 'xls',
			ppt: 'ppt', pptx: 'ppt',
			jpg: 'image', jpeg: 'image', png: 'image', gif: 'image', svg: 'image', webp: 'image',
			mp3: 'audio', wav: 'audio', ogg: 'audio',
			mp4: 'video', mov: 'video', avi: 'video', webm: 'video',
			zip: 'archive', rar: 'archive', tar: 'archive', gz: 'archive',
			js: 'code', ts: 'code', py: 'code', java: 'code', cpp: 'code', c: 'code', rb: 'code', go: 'code', rs: 'code',
			html: 'code', css: 'code', json: 'code', xml: 'code', yaml: 'code', yml: 'code',
			md: 'text', txt: 'text', rtf: 'text'
		};
		return iconMap[ext] || 'file';
	}

	function getIconColor(iconType: string): string {
		const colors: Record<string, string> = {
			folder: 'text-yellow-400',
			pdf: 'text-red-400',
			doc: 'text-blue-400',
			xls: 'text-green-400',
			ppt: 'text-orange-400',
			image: 'text-pink-400',
			audio: 'text-purple-400',
			video: 'text-red-400',
			archive: 'text-yellow-500',
			code: 'text-cyan-400',
			text: 'text-gray-400',
			file: 'text-gray-400'
		};
		return colors[iconType] || 'text-gray-400';
	}

	$: totalFiles = countFiles(files);

	function countFiles(items: FileItem[]): number {
		return items.reduce((acc, item) => {
			if (item.type === 'folder' && item.children) {
				return acc + countFiles(item.children);
			}
			return acc + 1;
		}, 0);
	}
</script>

<div class="files-viewer flex flex-col h-full bg-gray-900 rounded-lg overflow-hidden" transition:fade={{ duration: 150 }}>
	<ViewerHeader 
		title={title || basePath || $i18n.t('Files')}
		subtitle="{totalFiles} files"
		icon="files" 
		iconColor="text-yellow-400"
	>
		<svelte:fragment slot="actions">
			<!-- Download all as ZIP would go here -->
		</svelte:fragment>
	</ViewerHeader>

	<div class="flex-1 overflow-y-auto bg-gray-950 p-2">
		{#if parseError}
			<div class="p-4 text-red-400 text-sm">
				{$i18n.t('Error parsing files')}: {parseError}
			</div>
		{:else if files.length === 0}
			<div class="p-4 text-gray-500 text-sm text-center">
				{$i18n.t('No files')}
			</div>
		{:else}
			<div class="file-tree">
				{#each files as file}
					{@const iconType = getFileIcon(file)}
					{@const isExpanded = expandedFolders.has(file.path)}
					
					<div class="file-item">
						<button
							class="flex items-center gap-2 w-full px-2 py-1.5 rounded hover:bg-gray-800 text-left group"
							on:click={() => file.type === 'folder' && toggleFolder(file.path)}
						>
							{#if file.type === 'folder'}
								<svg class="w-3 h-3 text-gray-500 transition-transform {isExpanded ? 'rotate-90' : ''}" 
									fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
								</svg>
							{:else}
								<span class="w-3"></span>
							{/if}
							
							<svg class="w-4 h-4 {getIconColor(iconType)}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								{#if iconType === 'folder'}
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
										d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
								{:else}
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
										d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
								{/if}
							</svg>
							
							<span class="flex-1 text-sm text-gray-300 truncate">{file.name}</span>
							
							{#if file.size !== undefined}
								<span class="text-xs text-gray-500">{formatSize(file.size)}</span>
							{/if}
							
							{#if file.type === 'file'}
								<button
									class="p-1 rounded hover:bg-gray-700 text-gray-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
									on:click|stopPropagation
									title={$i18n.t('Download')}
								>
									<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
											d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
									</svg>
								</button>
							{/if}
						</button>
						
						{#if file.type === 'folder' && file.children && isExpanded}
							<div class="pl-5 border-l border-gray-800 ml-3">
								{#each file.children as child}
									{@const childIconType = getFileIcon(child)}
									<button
										class="flex items-center gap-2 w-full px-2 py-1.5 rounded hover:bg-gray-800 text-left group"
									>
										<span class="w-3"></span>
										<svg class="w-4 h-4 {getIconColor(childIconType)}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
												d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
										</svg>
										<span class="flex-1 text-sm text-gray-300 truncate">{child.name}</span>
										{#if child.size !== undefined}
											<span class="text-xs text-gray-500">{formatSize(child.size)}</span>
										{/if}
									</button>
								{/each}
							</div>
						{/if}
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>

<style>
	.files-viewer {
		min-height: 200px;
	}
</style>
