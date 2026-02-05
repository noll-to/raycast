import { NOLL_API_URL } from "./config";

type StartTranslationResponse = {
	jobId: string;
};

type JobStatus = {
	status: "pending" | "processing" | "ready" | "failed";
	progress?: number;
	result?: {
		image: string; // base64 encoded
		detectedLanguage?: string;
	};
	error?: string;
};

export async function startTranslation(
	token: string,
	imageBuffer: Buffer,
	targetLanguage: string,
	filename: string,
): Promise<StartTranslationResponse> {
	const formData = new FormData();
	const blob = new Blob([imageBuffer], { type: "image/png" });
	formData.append("image", blob, filename);
	formData.append("targetLanguage", targetLanguage);

	const response = await fetch(`${NOLL_API_URL}/api/ext/translate`, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${token}`,
		},
		body: formData,
	});

	if (!response.ok) {
		const error = await response.text();
		throw new Error(`Failed to start translation: ${error}`);
	}

	return response.json();
}

export async function pollJob(
	token: string,
	jobId: string,
): Promise<JobStatus> {
	const response = await fetch(`${NOLL_API_URL}/api/ext/job/${jobId}`, {
		method: "GET",
		headers: {
			Authorization: `Bearer ${token}`,
		},
	});

	if (!response.ok) {
		const error = await response.text();
		throw new Error(`Failed to get job status: ${error}`);
	}

	return response.json();
}
