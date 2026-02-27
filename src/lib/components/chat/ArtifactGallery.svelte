<script lang="ts">
	import { getContext, onMount } from 'svelte';
	import type { Writable } from 'svelte/store';
	import type { i18n as i18nType } from 'i18next';
	import {
		chatId,
		brainArtifact,
		showBrainArtifact,
		showArtifacts,
		showControls,
		conversationArtifacts
	} from '$lib/stores';
	import {
		getConversationArtifacts,
		getArtifactContentUrl
	} from '$lib/apis/brain';
	import type { BrainArtifactResponse } from '$lib/apis/brain';

	const i18n = getContext<Writable<i18nType>>('i18n');

	let token = '';
	let loading = false;
	let collapsed = true;

	$: artifacts = $conversationArtifacts as BrainArtifactResponse[];
	$: hasArtifacts = artifacts.length > 0;

	onMount(() => {
		const stored = localStorage.getItem('token');
		if (stored) token = stored;
	});

	$: if ($chatId && token) {
		loadArtifacts($chatId);
	}

	async function loadArtifacts(cid: string) {
		if (!cid || !token) return;
		loading = true;
		try {
			const result = await getConversationArtifacts(token, cid);
			conversationArtifacts.set(result.artifacts || []);
		} catch {
			conversationArtifacts.set([]);
		} finally {
			loading = false;
		}
	}

	function openArtifact(art: BrainArtifactResponse) {
		const url = getArtifactContentUrl(art.artifact_id);
		const ext = art.file_name.split('.').pop()?.toLowerCase() || '';

		let type = art.type || 'file';
		if (['image', 'video', 'presentation', 'spreadsheet', 'document', 'html'].includes(type)) {
			if (type === 'presentation') type = 'slides';
		}

		brainArtifact.set({
			type: type as any,
			content: url,
			title: art.title || art.file_name,
			format: 'url',
			metadata: {
				artifact_id: art.artifact_id,
				mime_type: art.mime_type,
				file_size: art.file_size,
				...art.metadata
			}
		});
		showBrainArtifact.set(true);
		showArtifacts.set(true);
		showControls.set(true);
	}

	function getTypeIcon(type: string): string {
		const icons: Record<string, string> = {
			image: '🖼️', video: '🎬', presentation: '📑', slides: '📑',
			spreadsheet: '📊', document: '📄', html: '🌐', code: '📜',
			audio: '🎵', file: '📎'
		};
		return icons[type] || '📎';
	}

	function formatDate(dateStr: string): string {
		try {
			const d = new Date(dateStr);
			return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
		} catch {
			return dateStr;
		}
	}
</script>

{#if hasArtifacts}
	<div class="artifact-gallery mt-3">
		<button
			class="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors w-full"
			on:click={() => (collapsed = !collapsed)}
		>
			<svg
				class="w-3 h-3 transition-transform {collapsed ? '' : 'rotate-90'}"
				fill="none" stroke="currentColor" viewBox="0 0 24 24"
			>
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
			</svg>
			<span class="font-medium">{$i18n.t('Artifacts')}</span>
			<span class="bg-gray-200 dark:bg-gray-700 rounded-full px-1.5 py-0.5 text-[10px]">
				{artifacts.length}
			</span>
		</button>

		{#if !collapsed}
			<div class="grid grid-cols-2 gap-2 mt-2">
				{#each artifacts as art}
					<button
						class="group flex flex-col items-center p-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 hover:border-purple-300 dark:hover:border-purple-600 transition-all text-left"
						on:click={() => openArtifact(art)}
					>
						{#if art.type === 'image' && art.artifact_id}
							<div class="w-full h-16 rounded overflow-hidden mb-1.5 bg-gray-200 dark:bg-gray-700">
								<img
									src={getArtifactContentUrl(art.artifact_id)}
									alt={art.title || art.file_name}
									class="w-full h-full object-cover"
									loading="lazy"
								/>
							</div>
						{:else}
							<div class="w-full h-16 rounded flex items-center justify-center mb-1.5 bg-gray-100 dark:bg-gray-800 text-2xl">
								{getTypeIcon(art.type)}
							</div>
						{/if}
						<div class="w-full">
							<div class="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">
								{art.title || art.file_name}
							</div>
							<div class="text-[10px] text-gray-400 truncate">
								{formatDate(art.created_at)}
							</div>
						</div>
					</button>
				{/each}
			</div>
		{/if}
	</div>
{/if}
