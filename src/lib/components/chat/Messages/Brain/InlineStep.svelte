<script lang="ts">
	export let label: string = '';
	export let status: 'progress' | 'complete' | 'error' = 'complete';
</script>

<div class="flex items-center gap-2 py-1 text-xs">
	{#if status === 'progress'}
		<div class="w-3 h-3 border-[1.5px] border-gray-300 border-t-blue-500 rounded-full animate-spin flex-shrink-0"></div>
	{:else if status === 'complete'}
		<svg class="w-3 h-3 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
		</svg>
	{:else}
		<svg class="w-3 h-3 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" />
		</svg>
	{/if}
	<span class="text-gray-600 dark:text-gray-400 truncate">{label}</span>
</div>
