<script lang="ts">
	import { fade } from 'svelte/transition';
	import { getContext } from 'svelte';
	import type { Writable } from 'svelte/store';
	import type { i18n as i18nType } from 'i18next';
	import ViewerHeader from '../shared/ViewerHeader.svelte';
	import ViewerActions from '../shared/ViewerActions.svelte';

	const i18n = getContext<Writable<i18nType>>('i18n');

	export let content: string = '';
	export let title: string = '';
	export let format: 'json' | 'csv' = 'json';
	export let columns: string[] = [];

	interface TableData {
		headers: string[];
		rows: string[][];
	}

	let tableData: TableData = { headers: [], rows: [] };
	let parseError = '';

	// Parse content based on format
	$: {
		parseError = '';
		try {
			if (format === 'csv') {
				tableData = parseCSV(content);
			} else {
				tableData = parseJSON(content);
			}
		} catch (e) {
			parseError = e instanceof Error ? e.message : 'Parse error';
			tableData = { headers: [], rows: [] };
		}
	}

	function parseCSV(csv: string): TableData {
		const lines = csv.trim().split('\n');
		if (lines.length === 0) return { headers: [], rows: [] };

		const headers = columns.length > 0 ? columns : lines[0].split(',').map(h => h.trim());
		const dataStart = columns.length > 0 ? 0 : 1;
		const rows = lines.slice(dataStart).map(line => 
			line.split(',').map(cell => cell.trim())
		);

		return { headers, rows };
	}

	function parseJSON(json: string): TableData {
		const data = JSON.parse(json);
		
		if (Array.isArray(data)) {
			if (data.length === 0) return { headers: [], rows: [] };
			
			// Array of objects
			if (typeof data[0] === 'object' && data[0] !== null) {
				const headers = columns.length > 0 ? columns : Object.keys(data[0]);
				const rows = data.map(item => headers.map(h => String(item[h] ?? '')));
				return { headers, rows };
			}
			
			// Array of arrays
			if (Array.isArray(data[0])) {
				const headers = columns.length > 0 ? columns : data[0].map((_, i) => 'Col ' + (i + 1));
				const rows = columns.length > 0 ? data : data.slice(1);
				return { headers, rows: rows.map(r => r.map(String)) };
			}
		}

		throw new Error('Invalid data format');
	}

	function exportCSV(): string {
		const headerLine = tableData.headers.join(',');
		const dataLines = tableData.rows.map(row => row.join(','));
		return [headerLine, ...dataLines].join('\n');
	}

	$: rowCount = tableData.rows.length;
	$: colCount = tableData.headers.length;
</script>

<div class="spreadsheet-viewer flex flex-col h-full bg-gray-900 rounded-lg overflow-hidden" transition:fade={{ duration: 150 }}>
	<ViewerHeader 
		title={title || $i18n.t('Spreadsheet')}
		subtitle="{rowCount} rows, {colCount} cols"
		icon="spreadsheet" 
		iconColor="text-emerald-400"
	>
		<svelte:fragment slot="actions">
			<ViewerActions 
				content={exportCSV()} 
				filename="{title || 'data'}.csv"
				mimeType="text/csv"
				showOpen={false}
			/>
		</svelte:fragment>
	</ViewerHeader>

	<div class="flex-1 overflow-auto bg-gray-950">
		{#if parseError}
			<div class="p-4 text-red-400 text-sm">
				{$i18n.t('Error parsing data')}: {parseError}
			</div>
		{:else if tableData.headers.length === 0}
			<div class="p-4 text-gray-500 text-sm text-center">
				{$i18n.t('No data')}
			</div>
		{:else}
			<table class="w-full text-sm">
				<thead class="sticky top-0 bg-gray-800">
					<tr>
						<th class="px-3 py-2 text-left text-xs font-medium text-gray-400 border-b border-gray-700 w-10">#</th>
						{#each tableData.headers as header}
							<th class="px-3 py-2 text-left text-xs font-medium text-gray-300 border-b border-gray-700 whitespace-nowrap">
								{header}
							</th>
						{/each}
					</tr>
				</thead>
				<tbody>
					{#each tableData.rows as row, idx}
						<tr class="hover:bg-gray-800/50 {idx % 2 === 0 ? 'bg-gray-900/50' : ''}">
							<td class="px-3 py-2 text-xs text-gray-500 border-b border-gray-800">{idx + 1}</td>
							{#each row as cell}
								<td class="px-3 py-2 text-gray-300 border-b border-gray-800 whitespace-nowrap">
									{cell}
								</td>
							{/each}
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
	</div>
</div>

<style>
	.spreadsheet-viewer {
		min-height: 200px;
	}

	table {
		border-collapse: collapse;
	}
</style>
