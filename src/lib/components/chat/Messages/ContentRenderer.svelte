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
	import SearchBlock from './Brain/SearchBlock.svelte';
	import ActivityBlock from './Brain/ActivityBlock.svelte';
	import StepBlock from './Brain/StepBlock.svelte';
	import InlineStep from './Brain/InlineStep.svelte';

	export let id;
	export let content;

	// Store the artifact for this message so we can reopen it
	let localArtifact = null;

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
	// Search state (combines action + sources)
	let brainSearch = null; // { title, status, resultsCount, sources }
	// Activity state (for artifact generation like slides, images, etc.)
	let brainActivity = null; // { title, status, icon, items }
	// Delegation blocks: Map<delegation_id, { title, subtitle, status, icon, badge, durationMs, steps[] }>
	let brainDelegations = new Map();
	// Iteration progress
	let brainIteration = null; // { iteration, maxIterations }

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

	// Parse slide items from HTML content
	function parseSlideItems(html) {
		const items = [];
		try {
			const tempDiv = document.createElement('div');
			tempDiv.innerHTML = html;
			const slides = tempDiv.querySelectorAll('.slide, section.slide, [data-slide]');
			slides.forEach((slide, idx) => {
				// Try to get title from h1, h2, or first text content
				const h1 = slide.querySelector('h1');
				const h2 = slide.querySelector('h2');
				const badge = slide.querySelector('.badge');
				let label = `Slide ${idx + 1}`;
				if (h1) {
					label = h1.textContent?.trim() || label;
				} else if (h2) {
					label = h2.textContent?.trim() || label;
				}
				if (badge) {
					label = `${badge.textContent?.trim()}: ${label}`;
				}
				items.push({ label });
			});
		} catch (e) {
			// Fallback: just return empty
		}
		return items;
	}

	// Granular action labels (Spanish)
	const actionLabelsMap = {
		python: 'Ejecutando Python',
		shell: 'Ejecutando comando',
		javascript: 'Ejecutando JavaScript',
		web_search: 'Buscando en la web',
		web_fetch: 'Obteniendo página web',
		file_read: 'Leyendo archivo',
		file_write: 'Escribiendo archivo',
		code_exec: 'Ejecutando código',
		search: 'Buscando',
		read: 'Leyendo archivo',
		write: 'Escribiendo archivo',
		slides: 'Generando presentación',
		image: 'Generando imagen',
		web: 'Generando página web',
		files: 'Explorando archivos',
		data: 'Procesando datos',
		data_analysis: 'Analizando datos',
		document: 'Generando documento',
		planning: 'Planificando',
		summarizing: 'Resumiendo',
		delegate: 'Delegando a subagente',
	};

	// Actions that show as ActivityBlock (artifact generation)
	const activityActions = ['slides', 'image', 'web', 'files', 'document'];

	function normalizeStatus(s) {
		if (s === 'running') return 'progress';
		if (s === 'completed') return 'complete';
		return s || 'progress';
	}

	function processBrainEvents(events) {
		let newThinking = '';
		brainActions = [];
		brainSearch = null;
		brainActivity = null;
		const delegMap = new Map();
		brainIteration = null;

		for (const event of events) {
			const delegId = event.delegation_id;

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
						if (newThinking) {
							newThinking += '\n' + event.content;
						} else {
							newThinking = event.content;
						}
						brainThinkingStatus = 'progress';
					}
					break;

				case 'status':
					if (event.status_type === 'iteration') {
						brainIteration = {
							iteration: event.iteration || 0,
							maxIterations: event.max_iterations || 0
						};
					}
					break;

				case 'outline':
					brainActions = [...brainActions, {
						action: 'outline',
						status: 'complete',
						content: event.title || 'Estructura del documento'
					}];
					break;

				case 'action': {
					const actionKey = event.action_type || event.action || event.title || 'data';
					const actionStatus = normalizeStatus(event.status);
					const actionLabel = event.title || actionLabelsMap[actionKey] || actionKey;

					// Delegation events => group into StepBlock
					if (actionKey === 'delegate' && delegId) {
						if (!delegMap.has(delegId)) {
							delegMap.set(delegId, {
								title: event.agent_name || 'Subagente',
								subtitle: event.title || '',
								status: actionStatus,
								icon: event.agent_icon || 'data',
								badge: '',
								durationMs: null,
								steps: []
							});
						}
						const d = delegMap.get(delegId);
						d.status = actionStatus;
						if (event.title) d.subtitle = event.title;
						if (event.duration_ms != null) d.durationMs = event.duration_ms;
						if (event.results_summary) d.badge = event.results_summary;
						if (actionStatus === 'complete') {
							d.status = 'complete';
						}
						break;
					}

					// If this event belongs to an active delegation, add as inner step
					if (delegId && delegMap.has(delegId)) {
						const d = delegMap.get(delegId);
						// When completing, find the last in-progress step with same label and update it
						if (actionStatus === 'complete' || actionStatus === 'error') {
							const lastIdx = d.steps.findLastIndex(s => s.label === actionLabel && s.status === 'progress');
							if (lastIdx >= 0) {
								d.steps[lastIdx].status = actionStatus;
							} else {
								d.steps.push({ label: actionLabel, status: actionStatus });
							}
						} else {
							d.steps.push({ label: actionLabel, status: actionStatus });
							d.subtitle = actionLabel;
						}
						break;
					}

					// Search actions => SearchBlock
					if (actionKey === 'search' || actionKey === 'web_search') {
						brainSearch = {
							title: actionLabel,
							status: actionStatus,
							resultsCount: event.results_count || 0,
							sources: brainSearch?.sources || []
						};
						break;
					}

					// Activity actions => ActivityBlock
					if (activityActions.includes(actionKey)) {
						brainActivity = {
							title: actionLabelsMap[actionKey] || actionLabel,
							status: actionStatus,
							icon: actionKey,
							items: brainActivity?.items || []
						};
						break;
					}

					// Regular actions => ActionBlock
					const newAction = {
						...event,
						action: actionKey,
						status: actionStatus,
						content: event.content || event.description || ''
					};
					const existingIdx = brainActions.findIndex(a => a.action === actionKey);
					if (existingIdx >= 0) {
						brainActions = [
							...brainActions.slice(0, existingIdx),
							newAction,
							...brainActions.slice(existingIdx + 1)
						];
					} else {
						brainActions = [...brainActions, newAction];
					}
					break;
				}

				case 'sources':
					if (event.sources && event.sources.length > 0) {
						// If sources belong to a delegation, add as step
						if (delegId && delegMap.has(delegId)) {
							const d = delegMap.get(delegId);
							d.steps.push({
								label: `${event.sources.length} fuentes encontradas`,
								status: 'complete'
							});
							break;
						}
						if (brainSearch) {
							brainSearch = {
								...brainSearch,
								sources: event.sources
							};
						} else {
							brainSearch = {
								title: 'Búsqueda',
								status: 'complete',
								resultsCount: event.sources.length,
								sources: event.sources
							};
						}
					}
					break;

				case 'artifact':
					// Artifacts now arrive via SSE named events (brain.artifact),
					// not as inline markers. This case is kept as a no-op for
					// backward compat with any cached messages that still contain
					// the old <!--BRAIN_EVENT:artifact--> markers.
					break;
			}
		}

		brainThinking = newThinking;
		brainDelegations = delegMap;
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

	// Reopen artifact panel with the stored artifact
	function reopenArtifact() {
		if (localArtifact) {
			brainArtifact.set(localArtifact);
			showBrainArtifact.set(true);
			showArtifacts.set(true);
			showControls.set(true);
		}
	}

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
	<!-- Brain Events (Thinking, Search, Delegations, Activity, Actions) -->
	{#if isBrain}
		{#if brainThinking}
			<ThinkingBlock
				content={brainThinking}
				status={brainThinkingStatus}
				collapsed={done}
			/>
		{/if}

		{#if brainSearch}
			<SearchBlock
				title={brainSearch.title}
				status={brainSearch.status}
				resultsCount={brainSearch.resultsCount}
				sources={brainSearch.sources || []}
				collapsed={done}
			/>
		{/if}

		<!-- Delegation blocks (Cursor-style double-line collapsible) -->
		{#each [...brainDelegations.entries()] as [delegId, deleg] (delegId)}
			<StepBlock
				title={deleg.title}
				subtitle={deleg.subtitle}
				status={deleg.status}
				icon={deleg.icon}
				badge={deleg.badge}
				durationMs={deleg.durationMs}
				collapsed={done && deleg.status === 'complete'}
			>
				{#each deleg.steps as step}
					<InlineStep label={step.label} status={step.status} />
				{/each}
			</StepBlock>
		{/each}

		{#if brainActivity}
			<ActivityBlock
				title={brainActivity.title}
				status={brainActivity.status}
				icon={brainActivity.icon}
				items={brainActivity.items || []}
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

	<!-- Artifact card button to reopen -->
	{#if localArtifact && done}
		<button
			class="artifact-card group flex items-center gap-3 w-full mt-3 p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 hover:border-purple-300 dark:hover:border-purple-600 transition-all duration-200 text-left"
			on:click={reopenArtifact}
		>
			{#if localArtifact.type === 'image' && localArtifact.format === 'url'}
				<div class="flex-shrink-0 w-10 h-10 rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700">
					<img src={localArtifact.content} alt="" class="w-full h-full object-cover" loading="lazy" />
				</div>
			{:else}
				<div class="flex-shrink-0 w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-lg">
					{localArtifact.type === 'slides' ? '📑' : localArtifact.type === 'image' ? '🖼️' : localArtifact.type === 'spreadsheet' ? '📊' : localArtifact.type === 'video' ? '🎬' : localArtifact.type === 'terminal' ? '⚡' : '📄'}
				</div>
			{/if}
			<div class="flex-1 min-w-0">
				<div class="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
					{localArtifact.title || $i18n.t('Artifact')}
				</div>
				<div class="text-xs text-gray-500 dark:text-gray-400">
					{$i18n.t('Click to view')}
				</div>
			</div>
			<div class="flex-shrink-0 text-gray-400 group-hover:text-purple-500 transition-colors">
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
				</svg>
			</div>
		</button>
	{/if}
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
