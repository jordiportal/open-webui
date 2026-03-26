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
	artifact_id: string;
	name: string | null;
	description: string | null;
	parts: Array<{
		kind: string;
		text?: string;
		file?: { uri?: string; bytes?: string; name?: string; mime_type?: string };
		data?: Record<string, any>;
		metadata?: Record<string, any>;
	}>;
	metadata: Record<string, any>;
	source: string | null;
	conversation_id: string | null;
	agent_id: string | null;
	task_id: string | null;
	created_by: string | null;
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

export async function deleteWorkspaceFile(token: string, filePath: string): Promise<void> {
	const res = await proxyFetch(`workspace/files/${filePath}`, token, { method: 'DELETE' });
	if (!res.ok) {
		const err = await res.json().catch(() => ({ detail: 'Delete failed' }));
		throw new Error(err.detail || `Delete failed: ${res.status}`);
	}
}

export async function renameWorkspaceFile(
	token: string,
	path: string,
	newName: string
): Promise<{ old_path: string; new_path: string }> {
	const res = await proxyFetch('workspace/files/rename', token, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ path, new_name: newName })
	});
	if (!res.ok) {
		const err = await res.json().catch(() => ({ detail: 'Rename failed' }));
		throw new Error(err.detail || `Rename failed: ${res.status}`);
	}
	return res.json();
}

export async function moveWorkspaceFile(
	token: string,
	path: string,
	destination: string
): Promise<{ old_path: string; new_path: string }> {
	const res = await proxyFetch('workspace/files/move', token, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ path, destination })
	});
	if (!res.ok) {
		const err = await res.json().catch(() => ({ detail: 'Move failed' }));
		throw new Error(err.detail || `Move failed: ${res.status}`);
	}
	return res.json();
}

export async function copyWorkspaceFile(
	token: string,
	path: string,
	destination: string
): Promise<void> {
	const res = await proxyFetch('workspace/files/copy', token, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ path, destination })
	});
	if (!res.ok) {
		const err = await res.json().catch(() => ({ detail: 'Copy failed' }));
		throw new Error(err.detail || `Copy failed: ${res.status}`);
	}
}

export async function createWorkspaceDirectory(token: string, path: string): Promise<void> {
	const res = await proxyFetch('workspace/mkdir', token, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ path })
	});
	if (!res.ok) {
		const err = await res.json().catch(() => ({ detail: 'Mkdir failed' }));
		throw new Error(err.detail || `Mkdir failed: ${res.status}`);
	}
}

export async function uploadWorkspaceFile(
	token: string,
	file: File,
	path: string = 'uploads'
): Promise<{ file_name: string; path: string; size: number }> {
	const form = new FormData();
	form.append('file', file);
	form.append('path', path);
	const res = await proxyFetch('workspace/files/upload', token, {
		method: 'POST',
		body: form
	});
	if (!res.ok) {
		const err = await res.json().catch(() => ({ detail: 'Upload failed' }));
		throw new Error(err.detail || `Upload failed: ${res.status}`);
	}
	return res.json();
}

export interface OnlyOfficeConfig {
	config: Record<string, any>;
	onlyoffice_url: string;
	api_url: string;
}

export async function getOnlyOfficeStatus(token: string): Promise<{ enabled: boolean; public_url: string }> {
	const res = await proxyFetch('workspace/onlyoffice/status', token);
	if (!res.ok) return { enabled: false, public_url: '' };
	return res.json();
}

export async function getOnlyOfficeConfig(
	token: string,
	filePath: string
): Promise<OnlyOfficeConfig> {
	const res = await proxyFetch(`workspace/onlyoffice/config/${filePath}`, token);
	if (!res.ok) {
		const err = await res.json().catch(() => ({ detail: 'OnlyOffice config error' }));
		throw new Error(err.detail || `OnlyOffice config failed: ${res.status}`);
	}
	return res.json();
}

const OFFICE_EXTENSIONS = new Set([
	'docx', 'doc', 'odt', 'rtf',
	'xlsx', 'xls', 'csv', 'ods',
	'pptx', 'ppt', 'ppsx', 'odp',
	'pdf'
]);

export function isOfficeFile(filename: string): boolean {
	const ext = filename.split('.').pop()?.toLowerCase() || '';
	return OFFICE_EXTENSIONS.has(ext);
}
