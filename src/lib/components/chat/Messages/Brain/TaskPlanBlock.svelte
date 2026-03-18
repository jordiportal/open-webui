<script lang="ts">
	import { fade } from 'svelte/transition';
	import type { BrainEvent } from '$lib/utils/brain';

	export let goal: string = '';
	export let steps: Array<{ index: number; description: string; status: string }> = [];
	export let done: boolean = false;

	interface StatusConfig {
		icon: string;
		color: string;
		bg: string;
	}

	const STATUS_MAP: Record<string, StatusConfig> = {
		completed: {
			icon: 'M5 13l4 4L19 7',
			color: 'text-green-500',
			bg: 'bg-green-50 dark:bg-green-900/20'
		},
		in_progress: {
			icon: 'M13 10V3L4 14h7v7l9-11h-7z',
			color: 'text-blue-500',
			bg: 'bg-blue-50 dark:bg-blue-900/20'
		},
		skipped: {
			icon: 'M13 5l7 7-7 7M5 5l7 7-7 7',
			color: 'text-gray-400',
			bg: 'bg-gray-50 dark:bg-gray-800/30'
		},
		pending: {
			icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
			color: 'text-gray-400',
			bg: ''
		}
	};

	function getStatus(status: string): StatusConfig {
		return STATUS_MAP[status] || STATUS_MAP.pending;
	}

	$: completedCount = steps.filter((s) => s.status === 'completed').length;
	$: totalCount = steps.length;
	$: progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
	$: allDone = completedCount === totalCount && totalCount > 0;
</script>

<div
	class="task-plan-block my-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 overflow-hidden"
	transition:fade={{ duration: 150 }}
>
	<!-- Header -->
	<div class="flex items-center gap-2.5 px-3.5 py-2.5 border-b border-gray-100 dark:border-gray-700/50">
		<svg
			class="w-4.5 h-4.5 flex-shrink-0 {allDone ? 'text-green-500' : 'text-purple-500'}"
			fill="none"
			stroke="currentColor"
			viewBox="0 0 24 24"
		>
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2"
				d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
			/>
		</svg>
		<span class="flex-1 text-sm font-medium text-gray-700 dark:text-gray-200 truncate">
			{goal}
		</span>
		<span class="text-xs font-medium px-1.5 py-0.5 rounded-full {allDone ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'}">
			{completedCount}/{totalCount}
		</span>
	</div>

	<!-- Progress bar -->
	<div class="h-0.5 bg-gray-100 dark:bg-gray-700">
		<div
			class="h-full transition-all duration-500 ease-out {allDone ? 'bg-green-500' : 'bg-purple-500'}"
			style="width: {progress}%"
		></div>
	</div>

	<!-- Steps -->
	<div class="px-3 py-2 space-y-0.5">
		{#each steps as step (step.index)}
			{@const cfg = getStatus(step.status)}
			<div
				class="flex items-start gap-2.5 px-2 py-1.5 rounded-lg transition-colors duration-150 {cfg.bg}"
			>
				<div class="flex-shrink-0 mt-0.5 relative">
					{#if step.status === 'in_progress'}
						<div class="w-4 h-4 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin"></div>
					{:else}
						<svg
							class="w-4 h-4 {cfg.color}"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={cfg.icon} />
						</svg>
					{/if}
				</div>
				<div class="flex-1 min-w-0">
					<span
						class="text-sm leading-snug {step.status === 'completed' ? 'text-gray-500 dark:text-gray-400 line-through' : step.status === 'skipped' ? 'text-gray-400 dark:text-gray-500 line-through' : 'text-gray-700 dark:text-gray-300'}"
					>
						{step.description}
					</span>
				</div>
			</div>
		{/each}
	</div>
</div>
