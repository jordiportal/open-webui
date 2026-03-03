<script lang="ts">
	import { fade } from 'svelte/transition';
	import { createEventDispatcher, getContext } from 'svelte';
	import type { Writable } from 'svelte/store';
	import type { i18n as i18nType } from 'i18next';

	const i18n = getContext<Writable<i18nType>>('i18n');
	const dispatch = createEventDispatcher();

	export let action: string = '';
	export let status: 'start' | 'progress' | 'complete' | 'error' = 'progress';
	export let description: string = '';

	// Action icons mapping
	const actionIcons: Record<string, string> = {
		search: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
		web_search: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
		browse: 'M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9',
		web_fetch: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4',
		code: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4',
		code_exec: 'M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
		python: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z',
		shell: 'M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
		javascript: 'M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
		file: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
		file_read: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253',
		file_write: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
		file_create: 'M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
		analyze: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
		data_analysis: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
		generate: 'M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z',
		data: 'M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4',
		slides: 'M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z',
		image: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z',
		web: 'M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9',
		files: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z',
		write: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
		read: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253',
		outline: 'M4 6h16M4 10h16M4 14h16M4 18h16',
		planning: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01',
		summarizing: 'M4 6h16M4 10h16M4 14h10',
		delegate: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
		default: 'M13 10V3L4 14h7v7l9-11h-7z'
	};

	// Action labels with descriptions (Spanish)
	const actionLabels: Record<string, { label: string; desc: string }> = {
		search: { label: 'Buscar', desc: 'Buscando información' },
		web_search: { label: 'Buscar en web', desc: 'Buscando en internet' },
		web_fetch: { label: 'Obtener web', desc: 'Descargando página web' },
		data: { label: 'Datos', desc: 'Procesando datos' },
		data_analysis: { label: 'Análisis', desc: 'Analizando datos' },
		slides: { label: 'Presentación', desc: 'Generando presentación' },
		image: { label: 'Imagen', desc: 'Generando imagen' },
		code: { label: 'Código', desc: 'Escribiendo código' },
		code_exec: { label: 'Ejecutar', desc: 'Ejecutando código' },
		python: { label: 'Python', desc: 'Ejecutando código Python' },
		shell: { label: 'Terminal', desc: 'Ejecutando comando' },
		javascript: { label: 'JavaScript', desc: 'Ejecutando JavaScript' },
		file: { label: 'Archivo', desc: 'Procesando archivo' },
		file_read: { label: 'Leer archivo', desc: 'Leyendo archivo' },
		file_write: { label: 'Escribir archivo', desc: 'Escribiendo archivo' },
		file_create: { label: 'Crear', desc: 'Creando archivo' },
		write: { label: 'Escribir', desc: 'Escribiendo contenido' },
		read: { label: 'Leer', desc: 'Leyendo documento' },
		analyze: { label: 'Analizar', desc: 'Analizando contenido' },
		web: { label: 'Web', desc: 'Obteniendo página web' },
		files: { label: 'Archivos', desc: 'Gestionando archivos' },
		outline: { label: 'Esquema', desc: 'Creando estructura' },
		planning: { label: 'Planificando', desc: 'Planificando los pasos' },
		summarizing: { label: 'Resumiendo', desc: 'Generando resumen' },
		delegate: { label: 'Subagente', desc: 'Delegando tarea' },
	};

	$: icon = actionIcons[action] || actionIcons.default;
	$: actionInfo = actionLabels[action] || { label: action, desc: '' };
	$: displayLabel = actionInfo.label || action || 'Processing';
	$: displayDesc = description || actionInfo.desc || '';
	$: isComplete = status === 'complete';
	$: isError = status === 'error';
	$: isActive = status === 'start' || status === 'progress';

	$: statusColor = isError
		? 'text-red-500'
		: isComplete
			? 'text-green-500'
			: 'text-blue-500';

	$: bgColor = isError
		? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
		: isComplete
			? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
			: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
</script>

<div
	class="brain-action-block flex items-center gap-3 px-3 py-2 my-1 rounded-lg border transition-all duration-200 {bgColor}"
	transition:fade={{ duration: 150 }}
>
	<!-- Action icon with status -->
	<div class="relative flex-shrink-0">
		<svg
			class="w-5 h-5 {statusColor} {isActive ? 'animate-pulse' : ''}"
			fill="none"
			stroke="currentColor"
			viewBox="0 0 24 24"
		>
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={icon} />
		</svg>
		
		{#if isActive}
			<span class="absolute -bottom-1 -right-1 flex h-2 w-2">
				<span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
				<span class="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
			</span>
		{/if}
	</div>

	<!-- Action content -->
	<div class="flex-1 min-w-0">
		<div class="flex items-center gap-2">
			<span class="text-sm font-medium text-gray-700 dark:text-gray-300">
				{displayLabel}
			</span>
			
			{#if isComplete}
				<svg class="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
				</svg>
			{:else if isError}
				<svg class="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
				</svg>
			{/if}
		</div>
		
		{#if displayDesc}
			<p class="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
				{displayDesc}
			</p>
		{/if}
	</div>

	<!-- Loading spinner for active state -->
	{#if isActive}
		<div class="flex-shrink-0">
			<svg class="animate-spin h-4 w-4 text-blue-500" fill="none" viewBox="0 0 24 24">
				<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
				<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
			</svg>
		</div>
	{/if}
</div>
