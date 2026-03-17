import { browser, dev } from '$app/environment';

const SANDBOX_API_URL = browser
	? (import.meta.env.VITE_SANDBOX_MANAGER_URL as string) || `${location.protocol}//${location.hostname}:9090`
	: '';

const headers = (token: string) => ({
	Accept: 'application/json',
	'Content-Type': 'application/json',
	authorization: `Bearer ${token}`
});

export const getSandboxManagerUrl = () => SANDBOX_API_URL;

export const getSandboxTypes = async (token: string) => {
	const res = await fetch(`${SANDBOX_API_URL}/api/types`, {
		method: 'GET',
		headers: headers(token)
	});
	if (!res.ok) throw new Error('Failed to fetch sandbox types');
	return res.json();
};

export const getSandboxes = async (token: string) => {
	const res = await fetch(`${SANDBOX_API_URL}/api/workspaces`, {
		method: 'GET',
		headers: headers(token)
	});
	if (!res.ok) throw new Error('Failed to fetch sandboxes');
	return res.json();
};

export const createSandbox = async (token: string, type: string = 'programming') => {
	const res = await fetch(`${SANDBOX_API_URL}/api/workspaces`, {
		method: 'POST',
		headers: headers(token),
		body: JSON.stringify({ type })
	});
	if (!res.ok) throw new Error('Failed to create sandbox');
	return res.json();
};

export const getSandbox = async (token: string, id: string) => {
	const res = await fetch(`${SANDBOX_API_URL}/api/workspaces/${id}`, {
		method: 'GET',
		headers: headers(token)
	});
	if (!res.ok) throw new Error('Failed to fetch sandbox');
	return res.json();
};

export const startSandbox = async (token: string, id: string) => {
	const res = await fetch(`${SANDBOX_API_URL}/api/workspaces/${id}/start`, {
		method: 'POST',
		headers: headers(token)
	});
	if (!res.ok) throw new Error('Failed to start sandbox');
	return res.json();
};

export const stopSandbox = async (token: string, id: string) => {
	const res = await fetch(`${SANDBOX_API_URL}/api/workspaces/${id}/stop`, {
		method: 'POST',
		headers: headers(token)
	});
	if (!res.ok) throw new Error('Failed to stop sandbox');
	return res.json();
};

export const deleteSandbox = async (token: string, id: string) => {
	const res = await fetch(`${SANDBOX_API_URL}/api/workspaces/${id}`, {
		method: 'DELETE',
		headers: headers(token)
	});
	if (!res.ok) throw new Error('Failed to delete sandbox');
	return res.json();
};
