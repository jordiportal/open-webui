// Brain Components - UI components for Brain agent integration

// Event display components
export { default as ThinkingBlock } from './ThinkingBlock.svelte';
export { default as ActionBlock } from './ActionBlock.svelte';
export { default as SourcesBlock } from './SourcesBlock.svelte';
export { default as BrainEventRenderer } from './BrainEventRenderer.svelte';

// Main artifact viewer (router)
export { default as ArtifactViewer } from './ArtifactViewer.svelte';

// Individual viewers
export { default as DocumentViewer } from './viewers/DocumentViewer.svelte';
export { default as SlidesViewer } from './viewers/SlidesViewer.svelte';
export { default as SpreadsheetViewer } from './viewers/SpreadsheetViewer.svelte';
export { default as TerminalViewer } from './viewers/TerminalViewer.svelte';
export { default as FilesViewer } from './viewers/FilesViewer.svelte';
export { default as WebsiteViewer } from './viewers/WebsiteViewer.svelte';
export { default as ImageViewer } from './viewers/ImageViewer.svelte';
export { default as OnlyOfficeViewer } from './viewers/OnlyOfficeViewer.svelte';

// Shared components
export { default as ViewerHeader } from './shared/ViewerHeader.svelte';
export { default as ViewerActions } from './shared/ViewerActions.svelte';

// Legacy exports (kept for backwards compatibility)
export { default as ConsoleViewer } from './ConsoleViewer.svelte';
