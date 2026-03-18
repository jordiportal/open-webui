<script lang="ts">
	import { createEventDispatcher, getContext } from 'svelte';
	import type { Writable } from 'svelte/store';
	import type { i18n as i18nType } from 'i18next';
	import type { BrainEvent } from '$lib/utils/brain';
	import { parseBrainEvents, isBrainModel } from '$lib/utils/brain';

	import ThinkingBlock from './ThinkingBlock.svelte';
	import ActionBlock from './ActionBlock.svelte';
	import SourcesBlock from './SourcesBlock.svelte';
	import TaskPlanBlock from './TaskPlanBlock.svelte';

	const i18n = getContext<Writable<i18nType>>('i18n');
	const dispatch = createEventDispatcher();

	export let content: string = '';
	export let modelId: string = '';
	export let done: boolean = false;

	let parsedContent: { text: string; events: BrainEvent[] } = { text: '', events: [] };
	let thinkingContent: string = '';
	let thinkingStatus: 'start' | 'progress' | 'complete' | 'error' = 'progress';
	let actions: BrainEvent[] = [];
	let sources: BrainEvent[] = [];
	let artifact: BrainEvent | null = null;
	let taskPlanGoal: string = '';
	let taskPlanSteps: Array<{ index: number; description: string; status: string }> = [];
	let hasTaskPlan: boolean = false;

	// Parse content when it changes
	$: if (content) {
		parsedContent = parseBrainEvents(content);
		processEvents(parsedContent.events);
	}

	// Mark thinking as complete when message is done
	$: if (done && thinkingContent) {
		thinkingStatus = 'complete';
	}

	function processEvents(events: BrainEvent[]) {
		// Reset accumulators
		let newThinking = '';
		actions = [];
		sources = [];
		artifact = null;

		for (const event of events) {
			switch (event.type) {
				case 'thinking':
					if (event.status === 'start') {
						newThinking = '';
						thinkingStatus = 'progress';
					} else if (event.status === 'complete') {
						thinkingStatus = 'complete';
					} else if (event.status === 'error') {
						thinkingStatus = 'error';
					} else if (event.content) {
						newThinking += event.content;
					}
					break;
				case 'action':
					actions = [...actions, event];
					break;
				case 'sources':
					sources = [...sources, event];
					break;
				case 'artifact':
					artifact = event;
					dispatch('artifact', event);
					break;
				case 'task_plan':
					if (event.goal && event.steps) {
						taskPlanGoal = event.goal;
						taskPlanSteps = event.steps.map((s) => ({ ...s }));
						hasTaskPlan = true;
					}
					break;
				case 'task_plan_update':
					if (hasTaskPlan && event.step_index !== undefined) {
						taskPlanSteps = taskPlanSteps.map((s) =>
							s.index === event.step_index
								? { ...s, status: event.status || s.status }
								: s
						);
					}
					break;
			}
		}

		thinkingContent = newThinking;
	}

	$: isBrain = isBrainModel(modelId);
	$: hasThinking = thinkingContent.length > 0;
	$: hasActions = actions.length > 0;
	$: hasSources = sources.length > 0;
	$: cleanText = parsedContent.text;
</script>

{#if isBrain}
	<div class="brain-event-renderer space-y-2">
		<!-- Thinking block -->
		{#if hasThinking}
			<ThinkingBlock
				content={thinkingContent}
				status={thinkingStatus}
				collapsed={done}
			/>
		{/if}

		<!-- Actions -->
		{#if hasActions}
			<div class="brain-actions space-y-1">
				{#each actions as action}
					<ActionBlock
						action={action.action || ''}
						status={action.status || 'complete'}
						description={action.content || ''}
					/>
				{/each}
			</div>
		{/if}

		<!-- Sources -->
		{#if hasSources}
			{#each sources as sourceEvent}
				{#if sourceEvent.sources && sourceEvent.sources.length > 0}
					<SourcesBlock sources={sourceEvent.sources} />
				{/if}
			{/each}
		{/if}

		<!-- Task Plan -->
		{#if hasTaskPlan}
			<TaskPlanBlock
				goal={taskPlanGoal}
				steps={taskPlanSteps}
				{done}
			/>
		{/if}
	</div>
{/if}

<!-- Pass clean text to parent for normal rendering -->
<slot text={cleanText} {artifact} />
