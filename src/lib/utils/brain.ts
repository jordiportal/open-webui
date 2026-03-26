/**
 * Brain Event Parser
 * 
 * Utilities for parsing Brain events embedded in streaming responses.
 * Brain events are embedded as HTML comments: <!--BRAIN_EVENT:{...}-->
 */

export interface BrainEvent {
	type: 'thinking' | 'action' | 'sources' | 'outline' | 'artifact' | 'text' | 'console' | 'error' | 'status' | 'task_plan' | 'task_plan_update';
	content?: string;
	artifact_type?: 'slides' | 'code' | 'html' | 'svg' | 'document' | 'image' | 'spreadsheet' | 'video' | 'website' | 'file';
	format?: string;
	title?: string;
	action?: string;
	action_type?: string;
	status?: 'start' | 'progress' | 'complete' | 'error' | 'running' | 'completed';
	sources?: Array<{ title: string; url: string; snippet?: string }>;
	items?: string[];
	language?: string;
	output?: string;
	error?: string;
	url?: string;
	artifact_id?: string;
	mime_type?: string;
	metadata?: Record<string, any>;
	// Delegation fields
	delegation_id?: string;
	agent_name?: string;
	agent_icon?: string;
	duration_ms?: number;
	results_summary?: string;
	// Iteration fields
	status_type?: string;
	iteration?: number;
	max_iterations?: number;
	description?: string;
	results_count?: number;
	// Task plan fields
	plan_id?: string;
	goal?: string;
	steps?: Array<{ index: number; description: string; status: string }>;
	step_index?: number;
	result_summary?: string;
}

export interface ParsedContent {
	text: string;
	events: BrainEvent[];
}

const BRAIN_EVENT_REGEX = /<!--BRAIN_EVENT:(.*?)-->/gs;

/**
 * Decode base64 string to UTF-8 text
 */
function decodeBase64(base64: string): string {
	try {
		// Browser-compatible base64 decoding
		return decodeURIComponent(
			atob(base64)
				.split('')
				.map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
				.join('')
		);
	} catch (e) {
		console.warn('Failed to decode base64:', e);
		return '';
	}
}

/**
 * Parse Brain events from streaming content
 * Returns both the clean text and extracted events
 */
export function parseBrainEvents(content: string): ParsedContent {
	const events: BrainEvent[] = [];
	let text = content;

	// Reset regex lastIndex to ensure fresh matching
	BRAIN_EVENT_REGEX.lastIndex = 0;

	// Extract all Brain events
	let match;
	while ((match = BRAIN_EVENT_REGEX.exec(content)) !== null) {
		try {
			const eventData = JSON.parse(match[1]);
			
			// Decode base64 content if present (used for artifacts with HTML)
			if (eventData.content_base64) {
				eventData.content = decodeBase64(eventData.content_base64);
				delete eventData.content_base64;
			}
			
			events.push(eventData);
		} catch (e) {
			console.warn('Failed to parse Brain event:', match[1], e);
		}
	}

	// Remove Brain event markers from text
	BRAIN_EVENT_REGEX.lastIndex = 0; // Reset again for replace
	text = content.replace(BRAIN_EVENT_REGEX, '').trim();

	return { text, events };
}

/**
 * Check if content contains Brain events
 */
export function hasBrainEvents(content: string): boolean {
	return BRAIN_EVENT_REGEX.test(content);
}

/**
 * Extract specific event types from parsed events
 */
export function getEventsByType<T extends BrainEvent['type']>(
	events: BrainEvent[],
	type: T
): BrainEvent[] {
	return events.filter((e) => e.type === type);
}

/**
 * Get the latest thinking event (may be streaming)
 */
export function getLatestThinking(events: BrainEvent[]): BrainEvent | null {
	const thinkingEvents = getEventsByType(events, 'thinking');
	return thinkingEvents.length > 0 ? thinkingEvents[thinkingEvents.length - 1] : null;
}

/**
 * Get all action events
 */
export function getActions(events: BrainEvent[]): BrainEvent[] {
	return getEventsByType(events, 'action');
}

/**
 * Get all source events
 */
export function getSources(events: BrainEvent[]): BrainEvent[] {
	return getEventsByType(events, 'sources');
}

/**
 * Get all console events
 */
export function getConsoleEvents(events: BrainEvent[]): BrainEvent[] {
	return getEventsByType(events, 'console');
}

/**
 * Check if Brain model is being used
 */
export function isBrainModel(modelId: string): boolean {
	return modelId?.toLowerCase().startsWith('brain-') || modelId?.toLowerCase().includes('brain');
}

/**
 * Accumulate Brain events from streaming chunks
 * Useful for building up state during streaming
 */
export class BrainEventAccumulator {
	private events: BrainEvent[] = [];
	private currentThinking: string = '';
	private currentArtifact: BrainEvent | null = null;

	addEvent(event: BrainEvent): void {
		this.events.push(event);

		if (event.type === 'thinking') {
			if (event.status === 'start') {
				this.currentThinking = '';
			} else if (event.content) {
				this.currentThinking += event.content;
			}
		}

		if (event.type === 'artifact') {
			this.currentArtifact = event;
		}
	}

	getEvents(): BrainEvent[] {
		return this.events;
	}

	getCurrentThinking(): string {
		return this.currentThinking;
	}

	getCurrentArtifact(): BrainEvent | null {
		return this.currentArtifact;
	}

	getActions(): BrainEvent[] {
		return getActions(this.events);
	}

	getSources(): BrainEvent[] {
		return getSources(this.events);
	}

	reset(): void {
		this.events = [];
		this.currentThinking = '';
		this.currentArtifact = null;
	}
}
