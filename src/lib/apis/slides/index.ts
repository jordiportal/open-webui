import { WEBUI_API_BASE_URL } from '$lib/constants';

export interface ConvertSlidesResponse {
	file_id: string;
	filename: string;
	download_url: string;
}

export interface OnlyOfficeConfigResponse {
	enabled: boolean;
	config?: {
		document: {
			fileType: string;
			key: string;
			title: string;
			url: string;
		};
		documentType: string;
		editorConfig: {
			callbackUrl?: string;
			lang: string;
			mode: string;
			user: {
				id: string;
				name: string;
			};
			customization: Record<string, unknown>;
		};
		token: string;
	};
	onlyoffice_url?: string;
	api_url?: string;
	error?: string;
}

export interface OnlyOfficeStatusResponse {
	enabled: boolean;
}

/**
 * Convert HTML slides to PPTX format
 */
export const convertSlidesToPptx = async (
	token: string,
	html: string,
	title: string = 'Presentation'
): Promise<ConvertSlidesResponse> => {
	let error = null;

	const res = await fetch(`${WEBUI_API_BASE_URL}/slides/convert`, {
		method: 'POST',
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json',
			authorization: `Bearer ${token}`
		},
		body: JSON.stringify({ html, title })
	})
		.then(async (res) => {
			if (!res.ok) throw await res.json();
			return res.json();
		})
		.catch((err) => {
			error = err.detail || err.message || 'Failed to convert slides';
			console.error(err);
			return null;
		});

	if (error) {
		throw error;
	}

	return res;
};

/**
 * Download a converted PPTX file
 * Returns the download URL to trigger a browser download
 */
export const downloadPptx = async (
	token: string,
	fileId: string
): Promise<void> => {
	// Create download link and trigger click
	const downloadUrl = `${WEBUI_API_BASE_URL}/slides/${fileId}/download`;
	
	const response = await fetch(downloadUrl, {
		method: 'GET',
		headers: {
			authorization: `Bearer ${token}`
		}
	});

	if (!response.ok) {
		const error = await response.json().catch(() => ({ detail: 'Download failed' }));
		throw error.detail || 'Download failed';
	}

	// Get filename from Content-Disposition header or use default
	const contentDisposition = response.headers.get('Content-Disposition');
	let filename = 'presentation.pptx';
	if (contentDisposition) {
		const match = contentDisposition.match(/filename="?([^";\n]+)"?/);
		if (match) {
			filename = match[1];
		}
	}

	// Create blob and download
	const blob = await response.blob();
	const url = window.URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	window.URL.revokeObjectURL(url);
	document.body.removeChild(a);
};

/**
 * Convert and download slides in one step
 */
export const convertAndDownloadSlides = async (
	token: string,
	html: string,
	title: string = 'Presentation'
): Promise<void> => {
	// First convert
	const result = await convertSlidesToPptx(token, html, title);
	
	// Then download
	await downloadPptx(token, result.file_id);
};

/**
 * Get OnlyOffice editor configuration for a file
 */
export const getOnlyOfficeConfig = async (
	token: string,
	fileId: string
): Promise<OnlyOfficeConfigResponse> => {
	let error = null;

	const res = await fetch(`${WEBUI_API_BASE_URL}/slides/${fileId}/onlyoffice`, {
		method: 'GET',
		headers: {
			Accept: 'application/json',
			authorization: `Bearer ${token}`
		}
	})
		.then(async (res) => {
			if (!res.ok) throw await res.json();
			return res.json();
		})
		.catch((err) => {
			error = err.detail || err.message || 'Failed to get OnlyOffice config';
			console.error(err);
			return null;
		});

	if (error) {
		throw error;
	}

	return res;
};

/**
 * Check if OnlyOffice integration is enabled
 */
export const getOnlyOfficeStatus = async (
	token: string
): Promise<OnlyOfficeStatusResponse> => {
	let error = null;

	const res = await fetch(`${WEBUI_API_BASE_URL}/slides/onlyoffice/status`, {
		method: 'GET',
		headers: {
			Accept: 'application/json',
			authorization: `Bearer ${token}`
		}
	})
		.then(async (res) => {
			if (!res.ok) throw await res.json();
			return res.json();
		})
		.catch((err) => {
			error = err.detail || err.message || 'Failed to get OnlyOffice status';
			console.error(err);
			return { enabled: false };
		});

	if (error) {
		return { enabled: false };
	}

	return res;
};

/**
 * Open file in OnlyOffice editor
 * Converts HTML to PPTX first, then opens editor route in new window
 */
export const openInOnlyOffice = async (
	token: string,
	html: string,
	title: string = 'Presentation'
): Promise<{ success: boolean; error?: string }> => {
	try {
		// First convert to PPTX
		const convertResult = await convertSlidesToPptx(token, html, title);
		
		// Open the editor route with the file ID
		const editorUrl = `/editor/${convertResult.file_id}`;
		window.open(editorUrl, '_blank');
		
		return { success: true };
		
	} catch (err) {
		console.error('Error opening in OnlyOffice:', err);
		return { 
			success: false, 
			error: err instanceof Error ? err.message : String(err) 
		};
	}
};
