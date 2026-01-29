<script>
	import { onDestroy, onMount, tick, getContext } from 'svelte';
	const i18n = getContext('i18n');

	import Markdown from './Markdown.svelte';
	import {
		artifactCode,
		chatId,
		mobile,
		settings,
		showArtifacts,
		showControls,
		showEmbeds,
		brainArtifact,
		showBrainArtifact
	} from '$lib/stores';
	import FloatingButtons from '../ContentRenderer/FloatingButtons.svelte';
	import { createMessagesList } from '$lib/utils';
	import { parseBrainEvents, isBrainModel } from '$lib/utils/brain';
	import ThinkingBlock from './Brain/ThinkingBlock.svelte';
	import ActionBlock from './Brain/ActionBlock.svelte';
	import SourcesBlock from './Brain/SourcesBlock.svelte';

	export let id;
	export let content;

	export let history;
	export let messageId;

	export let selectedModels = [];

	export let done = true;
	export let model = null;
	export let sources = null;

	export let save = false;
	export let preview = false;
	export let floatingButtons = true;

	export let editCodeBlock = true;
	export let topPadding = false;

	export let onSave = (e) => {};
	export let onSourceClick = (e) => {};
	export let onTaskClick = (e) => {};
	export let onAddMessages = (e) => {};

	let contentContainerElement;
	let floatingButtonsElement;

	// Brain event parsing
	let brainParsed = { text: '', events: [] };
	let brainThinking = '';
	let brainThinkingStatus = 'progress';
	let brainActions = [];
	let brainSources = [];

	// Determine if this is a Brain model response
	$: isBrain = model?.id ? isBrainModel(model.id) : false;

	// Parse Brain events from content
	$: if (content && isBrain) {
		brainParsed = parseBrainEvents(content);
		processBrainEvents(brainParsed.events);
	} else {
		brainParsed = { text: content || '', events: [] };
	}

	// Update thinking status when done
	$: if (done && brainThinking) {
		brainThinkingStatus = 'complete';
	}

	function processBrainEvents(events) {
		let newThinking = '';
		brainActions = [];
		brainSources = [];

		for (const event of events) {
			switch (event.type) {
				case 'thinking':
					if (event.status === 'start') {
						newThinking = '';
						brainThinkingStatus = 'progress';
					} else if (event.status === 'complete' || event.status === 'completed') {
						brainThinkingStatus = 'complete';
					} else if (event.status === 'error') {
						brainThinkingStatus = 'error';
					} else if (event.content) {
						// Accumulate thinking content (handles both streaming and batch)
						if (newThinking) {
							newThinking += '\n' + event.content;
						} else {
							newThinking = event.content;
						}
						brainThinkingStatus = 'progress';
					}
					break;
				case 'outline':
					// Treat outline as an informational action
					brainActions = [...brainActions, {
						action: 'outline',
						status: 'complete',
						content: event.title || 'Document outline'
					}];
					break;
				case 'action':
					// Handle both 'action' and 'action_type' field names
					brainActions = [...brainActions, {
						...event,
						action: event.action || event.action_type || event.title || 'Processing',
						status: event.status === 'running' ? 'progress' : event.status === 'completed' ? 'complete' : event.status || 'progress',
						content: event.content || event.description || ''
					}];
					break;
				case 'sources':
					brainSources = [...brainSources, event];
					break;
				case 'artifact':
					// Update the Brain artifact store to show in the artifacts panel
					if (event.content) {
						brainArtifact.set({
							type: event.artifact_type || 'html',
							content: event.content,
							title: event.title || '',
							format: event.format || 'html',
							language: event.language || '',
							timestamp: Date.now()
						});
						showBrainArtifact.set(true);
						showArtifacts.set(true);
						showControls.set(true);
					}
					break;
			}
		}
		brainThinking = newThinking;
	}

	// Get clean content for Markdown (without Brain event markers)
	$: cleanContent = isBrain ? brainParsed.text : content;

	const updateButtonPosition = (event) => {
		const buttonsContainerElement = document.getElementById(`floating-buttons-${id}`);
		if (
			!contentContainerElement?.contains(event.target) &&
			!buttonsContainerElement?.contains(event.target)
		) {
			closeFloatingButtons();
			return;
		}

		setTimeout(async () => {
			await tick();

			if (!contentContainerElement?.contains(event.target)) return;

			let selection = window.getSelection();

			if (selection.toString().trim().length > 0) {
				const range = selection.getRangeAt(0);
				const rect = range.getBoundingClientRect();

				const parentRect = contentContainerElement.getBoundingClientRect();

				// Adjust based on parent rect
				const top = rect.bottom - parentRect.top;
				const left = rect.left - parentRect.left;

				if (buttonsContainerElement) {
					buttonsContainerElement.style.display = 'block';

					// Calculate space available on the right
					const spaceOnRight = parentRect.width - left;
					let halfScreenWidth = $mobile ? window.innerWidth / 2 : window.innerWidth / 3;

					if (spaceOnRight < halfScreenWidth) {
						const right = parentRect.right - rect.right;
						buttonsContainerElement.style.right = `${right}px`;
						buttonsContainerElement.style.left = 'auto'; // Reset left
					} else {
						// Enough space, position using 'left'
						buttonsContainerElement.style.left = `${left}px`;
						buttonsContainerElement.style.right = 'auto'; // Reset right
					}
					buttonsContainerElement.style.top = `${top + 5}px`; // +5 to add some spacing
				}
			} else {
				closeFloatingButtons();
			}
		}, 0);
	};

	const closeFloatingButtons = () => {
		const buttonsContainerElement = document.getElementById(`floating-buttons-${id}`);
		if (buttonsContainerElement) {
			buttonsContainerElement.style.display = 'none';
		}

		if (floatingButtonsElement) {
			// check if closeHandler is defined

			if (typeof floatingButtonsElement?.closeHandler === 'function') {
				// call the closeHandler function
				floatingButtonsElement?.closeHandler();
			}
		}
	};

	const keydownHandler = (e) => {
		if (e.key === 'Escape') {
			closeFloatingButtons();
		}
	};

	onMount(() => {
		if (floatingButtons) {
			contentContainerElement?.addEventListener('mouseup', updateButtonPosition);
			document.addEventListener('mouseup', updateButtonPosition);
			document.addEventListener('keydown', keydownHandler);
		}
	});

	onDestroy(() => {
		if (floatingButtons) {
			contentContainerElement?.removeEventListener('mouseup', updateButtonPosition);
			document.removeEventListener('mouseup', updateButtonPosition);
			document.removeEventListener('keydown', keydownHandler);
		}
	});
</script>

<div bind:this={contentContainerElement}>
	<!-- Brain Events (Thinking, Actions, Sources) -->
	{#if isBrain}
		{#if brainThinking}
			<ThinkingBlock
				content={brainThinking}
				status={brainThinkingStatus}
				collapsed={done}
			/>
		{/if}

		{#if brainActions.length > 0}
			<div class="brain-actions space-y-1 my-2">
				{#each brainActions as action}
					<ActionBlock
						action={action.action || ''}
						status={action.status || 'complete'}
						description={action.content || ''}
					/>
				{/each}
			</div>
		{/if}

		{#if brainSources.length > 0}
			{#each brainSources as sourceEvent}
				{#if sourceEvent.sources && sourceEvent.sources.length > 0}
					<SourcesBlock sources={sourceEvent.sources} />
				{/if}
			{/each}
		{/if}
	{/if}

	<!-- Main Content (Markdown) -->
	<Markdown
		{id}
		content={cleanContent}
		{model}
		{save}
		{preview}
		{done}
		{editCodeBlock}
		{topPadding}
		sourceIds={(sources ?? []).reduce((acc, source) => {
			let ids = [];
			source.document.forEach((document, index) => {
				if (model?.info?.meta?.capabilities?.citations == false) {
					ids.push('N/A');
					return ids;
				}

				const metadata = source.metadata?.[index];
				const id = metadata?.source ?? 'N/A';

				if (metadata?.name) {
					ids.push(metadata.name);
					return ids;
				}

				if (id.startsWith('http://') || id.startsWith('https://')) {
					ids.push(id);
				} else {
					ids.push(source?.source?.name ?? id);
				}

				return ids;
			});

			acc = [...acc, ...ids];

			// remove duplicates
			return acc.filter((item, index) => acc.indexOf(item) === index);
		}, [])}
		{onSourceClick}
		{onTaskClick}
		{onSave}
		onUpdate={async (token) => {
			const { lang, text: code } = token;

			if (
				($settings?.detectArtifacts ?? true) &&
				(['html', 'svg'].includes(lang) || (lang === 'xml' && code.includes('svg'))) &&
				!$mobile &&
				$chatId
			) {
				await tick();
				showArtifacts.set(true);
				showControls.set(true);
			}
		}}
		onPreview={async (value) => {
			console.log('Preview', value);
			await artifactCode.set(value);
			await showControls.set(true);
			await showArtifacts.set(true);
			await showEmbeds.set(false);
		}}
	/>
</div>

{#if floatingButtons && model}
	<FloatingButtons
		bind:this={floatingButtonsElement}
		{id}
		{messageId}
		actions={$settings?.floatingActionButtons ?? []}
		model={(selectedModels ?? []).includes(model?.id)
			? model?.id
			: (selectedModels ?? []).length > 0
				? selectedModels.at(0)
				: model?.id}
		messages={createMessagesList(history, messageId)}
		onAdd={({ modelId, parentId, messages }) => {
			console.log(modelId, parentId, messages);
			onAddMessages({ modelId, parentId, messages });
			closeFloatingButtons();
		}}
	/>
{/if}
