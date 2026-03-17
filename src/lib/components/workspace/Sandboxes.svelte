<script lang="ts">
	import { onMount, getContext } from 'svelte';
	import { toast } from 'svelte-sonner';
	const i18n = getContext('i18n');

	import { WEBUI_NAME, user } from '$lib/stores';

	import {
		getSandboxes,
		getSandboxTypes,
		createSandbox,
		startSandbox,
		stopSandbox,
		deleteSandbox,
		getSandboxManagerUrl
	} from '$lib/apis/sandboxes';

	import Spinner from '../common/Spinner.svelte';
	import Tooltip from '../common/Tooltip.svelte';
	import ConfirmDialog from '../common/ConfirmDialog.svelte';

	let loaded = false;
	let sandboxes: Record<string, any> = {};
	let types: { id: string; label: string }[] = [];
	let creating = false;
	let selectedType = 'programming';

	let showDeleteConfirm = false;
	let deleteTarget: string | null = null;

	const load = async () => {
		try {
			const [typesRes, data] = await Promise.all([
				getSandboxTypes(localStorage.token),
				getSandboxes(localStorage.token)
			]);
			types = typesRes;
			sandboxes = data.workspaces || {};
		} catch (err) {
			toast.error($i18n.t('Failed to load sandboxes'));
			console.error(err);
		}
		loaded = true;
	};

	const handleCreate = async () => {
		creating = true;
		try {
			await createSandbox(localStorage.token, selectedType);
			toast.success($i18n.t('Sandbox created'));
			await load();
		} catch (err) {
			toast.error($i18n.t('Failed to create sandbox'));
			console.error(err);
		}
		creating = false;
	};

	const handleStart = async (id: string) => {
		try {
			await startSandbox(localStorage.token, id);
			toast.success($i18n.t('Sandbox started'));
			await load();
		} catch (err) {
			toast.error($i18n.t('Failed to start sandbox'));
		}
	};

	const handleStop = async (id: string) => {
		try {
			await stopSandbox(localStorage.token, id);
			toast.success($i18n.t('Sandbox stopped'));
			await load();
		} catch (err) {
			toast.error($i18n.t('Failed to stop sandbox'));
		}
	};

	const handleDelete = async (id: string) => {
		try {
			await deleteSandbox(localStorage.token, id);
			toast.success($i18n.t('Sandbox deleted'));
			await load();
		} catch (err) {
			toast.error($i18n.t('Failed to delete sandbox'));
		}
	};

	const confirmDelete = (id: string) => {
		deleteTarget = id;
		showDeleteConfirm = true;
	};

	const openUrl = (url: string) => {
		window.open(url, '_blank');
	};

	const typeLabel = (id: string) => {
		const t = types.find((x) => x.id === id);
		return t ? t.label : id;
	};

	onMount(load);
</script>

<ConfirmDialog
	bind:show={showDeleteConfirm}
	on:confirm={() => {
		if (deleteTarget) handleDelete(deleteTarget);
		deleteTarget = null;
	}}
>
	<div class="text-sm text-gray-500">
		<div class="bg-yellow-500/20 text-yellow-700 dark:text-yellow-200 rounded-lg px-4 py-3">
			{$i18n.t('Are you sure you want to delete this sandbox? All data will be lost.')}
		</div>
	</div>
</ConfirmDialog>

<div class="mt-0.5 mb-2 gap-1 flex flex-col md:flex-row justify-between">
	<div class="flex md:self-center text-lg font-medium px-0.5 shrink-0 items-center">
		{$i18n.t('Sandboxes')}
		<span class="text-lg ml-1 font-medium text-gray-500 dark:text-gray-300">
			{#if loaded}
				({Object.keys(sandboxes).length})
			{/if}
		</span>
	</div>

	<div class="flex gap-2 items-center">
		{#if types.length > 1}
			<select
				class="px-3 py-1.5 text-sm rounded-lg bg-gray-50 dark:bg-gray-850 border border-gray-200 dark:border-gray-700 outline-none"
				bind:value={selectedType}
			>
				{#each types as t}
					<option value={t.id}>{t.label}</option>
				{/each}
			</select>
		{/if}

		<Tooltip content={$i18n.t('Create Sandbox')}>
			<button
				class="flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium bg-gray-50 hover:bg-gray-100 dark:bg-gray-850 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 transition"
				on:click={handleCreate}
				disabled={creating}
			>
				{#if creating}
					<Spinner className="size-3.5" />
				{:else}
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="size-3.5">
						<path d="M8.75 3.75a.75.75 0 0 0-1.5 0v3.5h-3.5a.75.75 0 0 0 0 1.5h3.5v3.5a.75.75 0 0 0 1.5 0v-3.5h3.5a.75.75 0 0 0 0-1.5h-3.5v-3.5Z" />
					</svg>
				{/if}
				{$i18n.t('New Sandbox')}
			</button>
		</Tooltip>
	</div>
</div>

{#if !loaded}
	<div class="flex justify-center py-20">
		<Spinner />
	</div>
{:else if Object.keys(sandboxes).length === 0}
	<div class="text-center text-gray-500 dark:text-gray-400 py-20">
		<div class="text-4xl mb-4">&#128230;</div>
		<div class="text-lg font-medium">{$i18n.t('No sandboxes yet')}</div>
		<div class="text-sm mt-1">{$i18n.t('Create one to get started')}</div>
	</div>
{:else}
	<div class="grid gap-3 sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
		{#each Object.entries(sandboxes) as [id, ws]}
			<div
				class="flex flex-col rounded-xl border border-gray-100 dark:border-gray-850 bg-white dark:bg-gray-900 p-4 transition hover:shadow-sm"
			>
				<div class="flex items-center justify-between mb-3">
					<div class="flex items-center gap-2">
						<span
							class="inline-block size-2.5 rounded-full {ws.status === 'running'
								? 'bg-green-500'
								: 'bg-gray-400'}"
						/>
						<span class="font-medium text-sm text-gray-800 dark:text-gray-200 truncate">
							{id}
						</span>
					</div>
					<span
						class="text-xs px-2 py-0.5 rounded-full {ws.status === 'running'
							? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400'
							: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'}"
					>
						{ws.status || 'unknown'}
					</span>
				</div>

				<div class="text-xs text-gray-500 dark:text-gray-400 mb-3 space-y-1">
					<div class="flex items-center gap-1.5">
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="size-3">
							<path d="M2 3.5A1.5 1.5 0 0 1 3.5 2h9A1.5 1.5 0 0 1 14 3.5v9a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 2 12.5v-9Z" />
						</svg>
						{typeLabel(ws.type)}
					</div>
					{#if ws.createdAt}
						<div class="flex items-center gap-1.5">
							<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="size-3">
								<path fill-rule="evenodd" d="M4 1.75a.75.75 0 0 1 1.5 0V3h5V1.75a.75.75 0 0 1 1.5 0V3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2V1.75ZM4.5 7a.5.5 0 0 0 0 1h7a.5.5 0 0 0 0-1h-7Z" clip-rule="evenodd" />
							</svg>
							{new Date(ws.createdAt).toLocaleDateString()}
						</div>
					{/if}
				</div>

				{#if ws.status === 'running' && ws.urls}
					<div class="flex flex-wrap gap-1.5 mb-3">
						{#if ws.urls.opencode}
							<button
								class="text-xs px-2 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50 transition"
								on:click={() => openUrl(ws.urls.opencode)}
							>
								OpenCode
							</button>
						{/if}
						{#if ws.urls.preview}
							<button
								class="text-xs px-2 py-1 rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400 dark:hover:bg-purple-900/50 transition"
								on:click={() => openUrl(ws.urls.preview)}
							>
								Preview
							</button>
						{/if}
						{#if ws.urls.vnc || ws.urls.blender_vnc}
							<button
								class="text-xs px-2 py-1 rounded-lg bg-orange-50 text-orange-700 hover:bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400 dark:hover:bg-orange-900/50 transition"
								on:click={() => openUrl(ws.urls.vnc || ws.urls.blender_vnc)}
							>
								VNC
							</button>
						{/if}
					</div>
				{/if}

				<div class="flex items-center gap-1.5 mt-auto pt-2 border-t border-gray-50 dark:border-gray-800">
					{#if ws.status === 'running'}
						<Tooltip content={$i18n.t('Stop')}>
							<button
								class="p-1.5 rounded-lg text-gray-500 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition"
								on:click={() => handleStop(id)}
							>
								<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="size-4">
									<path d="M4.5 4.5h7v7h-7v-7Z" />
								</svg>
							</button>
						</Tooltip>
					{:else}
						<Tooltip content={$i18n.t('Start')}>
							<button
								class="p-1.5 rounded-lg text-gray-500 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition"
								on:click={() => handleStart(id)}
							>
								<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="size-4">
									<path d="M3 3.732a1.5 1.5 0 0 1 2.305-1.265l6.706 4.267a1.5 1.5 0 0 1 0 2.531l-6.706 4.268A1.5 1.5 0 0 1 3 12.267V3.732Z" />
								</svg>
							</button>
						</Tooltip>
					{/if}

					<div class="flex-1" />

					<Tooltip content={$i18n.t('Delete')}>
						<button
							class="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
							on:click={() => confirmDelete(id)}
						>
							<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="size-4">
								<path fill-rule="evenodd" d="M5 3.25V4H2.75a.75.75 0 0 0 0 1.5h.3l.815 8.15A1.5 1.5 0 0 1 5.357 15h5.285a1.5 1.5 0 0 1 1.493-1.35l.815-8.15h.3a.75.75 0 0 0 0-1.5H11v-.75A2.25 2.25 0 0 0 8.75 1h-1.5A2.25 2.25 0 0 0 5 3.25Zm2.25-.75a.75.75 0 0 0-.75.75V4h3v-.75a.75.75 0 0 0-.75-.75h-1.5ZM6.05 6a.75.75 0 0 1 .787.713l.275 5.5a.75.75 0 0 1-1.498.075l-.275-5.5A.75.75 0 0 1 6.05 6Zm3.9 0a.75.75 0 0 1 .712.787l-.275 5.5a.75.75 0 0 1-1.498-.075l.275-5.5a.75.75 0 0 1 .786-.711Z" clip-rule="evenodd" />
							</svg>
						</button>
					</Tooltip>
				</div>
			</div>
		{/each}
	</div>
{/if}
