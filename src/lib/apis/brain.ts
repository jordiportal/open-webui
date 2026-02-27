/**
 * Brain API Client
 *
 * Utility functions that call Brain endpoints via the OpenWebUI proxy
 * (/api/brain-proxy/*) which handles OAuth token forwarding.
 */

const PROXY_BASE = '/api/brain-proxy';

export interface WorkspaceFile {
	name: string;
	is_directory: boolean;
	size: number;
	permissions: string;
}

export interface WorkspaceListResponse {
	path: string;
	files: WorkspaceFile[];
}

export interface BrainArtifactResponse {
	id: number;
	artifact_id: string;
	type: string;
	title: string | null;
	description: string | null;
	file_name: string;
	file_path: string;
	mime_type: string | null;
	file_size: number | null;
	conversation_id: string | null;
	agent_id: string | null;
	source: string;
	metadata: Record<string, any>;
	status: string;
	created_at: string;
	updated_at: string;
}

export interface ArtifactListResponse {
	artifacts: BrainArtifactResponse[];
	total: number;
	page: number;
	page_size: number;
}

async function proxyFetch(path: string, token: string, init?: RequestInit): Promise<Response> {
	const url = `${PROXY_BASE}/${path}`;
	return fetch(url, {
		...init,
		headers: {
			Authorization: `Bearer ${token}`,
			...(init?.headers || {})
		}
	});
}

export async function listWorkspaceFiles(
	token: string,
	dirPath: string = ''
): Promise<WorkspaceListResponse> {
	const res = await proxyFetch(`workspace/list/${dirPath}`, token);
	if (!res.ok) throw new Error(`Failed to list workspace: ${res.status}`);
	return res.json();
}

export function getWorkspaceFileUrl(filePath: string): string {
	return `${PROXY_BASE}/workspace/files/${filePath}`;
}

export async function getConversationArtifacts(
	token: string,
	conversationId: string,
	type?: string
): Promise<ArtifactListResponse> {
	let path = `artifacts/conversation/${conversationId}`;
	if (type) path += `?type=${type}`;
	const res = await proxyFetch(path, token);
	if (!res.ok) throw new Error(`Failed to get artifacts: ${res.status}`);
	return res.json();
}

export async function getRecentArtifacts(
	token: string,
	limit: number = 20
): Promise<ArtifactListResponse> {
	const res = await proxyFetch(`artifacts/recent?limit=${limit}`, token);
	if (!res.ok) throw new Error(`Failed to get recent artifacts: ${res.status}`);
	return res.json();
}

export function getArtifactContentUrl(artifactId: string): string {
	return `${PROXY_BASE}/artifacts/${artifactId}/content`;
}

export function getArtifactViewUrl(artifactId: string): string {
	return `${PROXY_BASE}/artifacts/${artifactId}/view`;
}

export async function listRecentMedia(
	token: string,
	limit: number = 20
): Promise<{ files: Array<{ path: string; name: string; type: string; url: string }> }> {
	const res = await proxyFetch(`workspace/media/recent?limit=${limit}`, token);
	if (!res.ok) throw new Error(`Failed to list media: ${res.status}`);
	return res.json();
}
