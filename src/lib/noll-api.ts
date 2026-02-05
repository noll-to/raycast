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
	if (!token) {
		throw new Error("No access token available");
	}

	const formData = new FormData();
	const blob = new Blob([imageBuffer], { type: "image/png" });
	formData.append("image", blob, filename);
	formData.append("targetLanguage", targetLanguage);

	const headers = new Headers();
	headers.set("Authorization", `Bearer ${token}`);
	headers.set("User-Agent", "noll-raycast/1.0");

	console.log(
		"Starting translation with token:",
		token.substring(0, 20) + "...",
	);

	const response = await fetch(`${NOLL_API_URL}/api/ext/translate`, {
		method: "POST",
		headers,
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
			"User-Agent": "noll-raycast/1.0",
		},
	});

	if (!response.ok) {
		const error = await response.text();
		throw new Error(`Failed to get job status: ${error}`);
	}

	return response.json();
}
