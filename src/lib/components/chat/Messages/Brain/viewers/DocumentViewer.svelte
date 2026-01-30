<script lang="ts">
	import { fade } from 'svelte/transition';
	import { getContext } from 'svelte';
	import type { Writable } from 'svelte/store';
	import type { i18n as i18nType } from 'i18next';
	import ViewerHeader from '../shared/ViewerHeader.svelte';
	import ViewerActions from '../shared/ViewerActions.svelte';
	import { marked } from 'marked';

	const i18n = getContext<Writable<i18nType>>('i18n');

	export let content: string = '';
	export let title: string = '';
	export let format: 'markdown' | 'html' = 'markdown';

	let renderedContent = '';

	$: {
		if (format === 'markdown') {
			renderedContent = marked(content || '', { breaks: true, gfm: true }) as string;
		} else {
			renderedContent = content || '';
		}
	}
</script>

<div class="document-viewer flex flex-col h-full bg-gray-900 rounded-lg overflow-hidden" transition:fade={{ duration: 150 }}>
	<ViewerHeader 
		{title} 
		subtitle={format === 'markdown' ? 'Markdown' : 'HTML'}
		icon="document" 
		iconColor="text-blue-400"
	>
		<svelte:fragment slot="actions">
			<ViewerActions 
				{content} 
				filename="{title || 'document'}.{format === 'markdown' ? 'md' : 'html'}"
				mimeType={format === 'markdown' ? 'text/markdown' : 'text/html'}
			/>
		</svelte:fragment>
	</ViewerHeader>

	<div class="flex-1 overflow-y-auto p-6 bg-white dark:bg-gray-950">
		<article class="document-content prose prose-sm dark:prose-invert max-w-none">
			{@html renderedContent}
		</article>
	</div>
</div>

<style>
	.document-viewer {
		min-height: 300px;
	}

	.document-content {
		font-family: 'Georgia', 'Times New Roman', serif;
		line-height: 1.8;
	}

	.document-content :global(h1) {
		font-size: 1.75rem;
		font-weight: 700;
		margin-bottom: 1rem;
		border-bottom: 1px solid rgba(0, 0, 0, 0.1);
		padding-bottom: 0.5rem;
	}

	.document-content :global(h2) {
		font-size: 1.4rem;
		font-weight: 600;
		margin-top: 1.5rem;
		margin-bottom: 0.75rem;
	}

	.document-content :global(h3) {
		font-size: 1.1rem;
		font-weight: 600;
		margin-top: 1.25rem;
		margin-bottom: 0.5rem;
	}

	.document-content :global(p) {
		margin-bottom: 1rem;
	}

	.document-content :global(ul), .document-content :global(ol) {
		margin-bottom: 1rem;
		padding-left: 1.5rem;
	}

	.document-content :global(li) {
		margin-bottom: 0.25rem;
	}

	.document-content :global(blockquote) {
		border-left: 4px solid #a78bfa;
		padding-left: 1rem;
		margin: 1rem 0;
		color: #6b7280;
		font-style: italic;
	}

	.document-content :global(code) {
		background: rgba(0, 0, 0, 0.05);
		padding: 0.125rem 0.375rem;
		border-radius: 0.25rem;
		font-size: 0.875em;
	}

	.document-content :global(pre) {
		background: #1e1e1e;
		padding: 1rem;
		border-radius: 0.5rem;
		overflow-x: auto;
		margin: 1rem 0;
	}

	.document-content :global(pre code) {
		background: transparent;
		padding: 0;
	}

	:global(.dark) .document-content :global(code) {
		background: rgba(255, 255, 255, 0.1);
	}
</style>
