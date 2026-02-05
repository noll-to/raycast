import fetch from "node-fetch";
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

	// Send as JSON with base64 to avoid FormData header issues
	const base64Image = imageBuffer.toString("base64");

	console.log(
		"Starting translation with token:",
		token.substring(0, 20) + "...",
	);

	const response = await fetch(`${NOLL_API_URL}/api/ext/translate`, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${token}`,
			"Content-Type": "application/json",
			"User-Agent": "noll-raycast/1.0",
		},
		body: JSON.stringify({
			image: base64Image,
			filename,
			targetLanguage,
		}),
	});

	if (!response.ok) {
		const error = await response.text();
		throw new Error(`Failed to start translation: ${error}`);
	}

	return response.json() as Promise<StartTranslationResponse>;
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

	return response.json() as Promise<JobStatus>;
}
