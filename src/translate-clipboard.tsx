import {
	Action,
	ActionPanel,
	Clipboard,
	Detail,
	getPreferenceValues,
	showToast,
	Toast,
} from "@raycast/api";
import fs from "fs/promises";
import path from "path";
import { useEffect, useState } from "react";
import { NOLL_API_URL } from "./lib/config";
import { pollJob, startTranslation } from "./lib/noll-api";
import { getAccessToken } from "./lib/oauth";

type State =
	| { type: "loading" }
	| { type: "authenticating" }
	| { type: "debug"; token: string; apiTest: string }
	| { type: "uploading" }
	| { type: "translating"; progress: number }
	| { type: "ready"; imageBase64: string; mimeType: string }
	| { type: "error"; message: string };

type Preferences = {
	defaultLanguage: string;
};

const POLL_INTERVAL_MS = 2000;

export default function TranslateClipboard() {
	const [state, setState] = useState<State>({ type: "loading" });
	const { defaultLanguage } = getPreferenceValues<Preferences>();

	useEffect(() => {
		let cancelled = false;

		async function run() {
			try {
				// 1. FIRST: Authenticate (before anything else)
				setState({ type: "authenticating" });
				console.log("Starting authentication...");

				const token = await getAccessToken();
				console.log(
					"Got token:",
					token ? `${token.substring(0, 20)}...` : "EMPTY",
				);

				if (cancelled) return;

				if (!token) {
					setState({
						type: "error",
						message: "Authentication failed - no token received",
					});
					return;
				}

				// 2. DEBUG: Test the token with a simple API call
				console.log("Testing token with API...");
				let apiTest = "Not tested";
				try {
					const testResponse = await fetch(
						`${NOLL_API_URL}/api/ext/job/test-123`,
						{
							method: "GET",
							headers: {
								Authorization: `Bearer ${token}`,
							},
						},
					);
					apiTest = `Status: ${testResponse.status}, Body: ${await testResponse.text()}`;
					console.log("API test result:", apiTest);
				} catch (e) {
					apiTest = `Error: ${e instanceof Error ? e.message : String(e)}`;
					console.log("API test error:", apiTest);
				}

				// 3. DEBUG: Show token and API test result, then STOP
				setState({
					type: "debug",
					token: token.substring(0, 50) + "...",
					apiTest,
				});
				return;

				// ============ EVERYTHING BELOW IS KEPT BUT WON'T RUN ============

				// 4. Read clipboard
				const { file } = await Clipboard.read();
				if (!file?.startsWith("file://")) {
					setState({
						type: "error",
						message:
							"No image in clipboard!\n\nTake a screenshot with **Cmd+Shift+4**",
					});
					return;
				}

				// 5. Read image file
				const imagePath = decodeURI(file.substring(7));
				const imageBuffer = await fs.readFile(imagePath);
				const filename = path.basename(imagePath);
				const ext = path.extname(imagePath).toLowerCase();
				const mimeType =
					ext === ".png"
						? "image/png"
						: ext === ".jpg" || ext === ".jpeg"
							? "image/jpeg"
							: "image/png";

				// 6. Start translation
				setState({ type: "uploading" });
				const { jobId } = await startTranslation(
					token,
					imageBuffer,
					defaultLanguage,
					filename,
				);

				if (cancelled) return;

				// 7. Poll for completion
				setState({ type: "translating", progress: 0 });

				while (!cancelled) {
					const job = await pollJob(token, jobId);

					if (job.status === "ready" && job.result?.image) {
						setState({
							type: "ready",
							imageBase64: job.result.image,
							mimeType,
						});
						await showToast({
							style: Toast.Style.Success,
							title: "Translation complete!",
						});
						return;
					}

					if (job.status === "failed") {
						setState({
							type: "error",
							message: job.error || "Translation failed",
						});
						return;
					}

					setState({ type: "translating", progress: job.progress || 0 });
					await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
				}
			} catch (e) {
				if (cancelled) return;
				const message = e instanceof Error ? e.message : "Unknown error";
				console.error("Error:", message);
				setState({ type: "error", message });
				await showToast({
					style: Toast.Style.Failure,
					title: "Error",
					message,
				});
			}
		}

		run();

		return () => {
			cancelled = true;
		};
	}, [defaultLanguage]);

	// Render based on state
	if (state.type === "error") {
		return <Detail markdown={`## Error\n\n${state.message}`} />;
	}

	if (state.type === "loading") {
		return <Detail isLoading markdown="Starting..." />;
	}

	if (state.type === "authenticating") {
		return <Detail isLoading markdown="Signing in to Noll..." />;
	}

	// DEBUG STATE - show token and API test result
	if (state.type === "debug") {
		const markdown = `## Debug Info

### Token
\`\`\`
${state.token}
\`\`\`

### API Test Result (GET /api/ext/job/test-123)
\`\`\`
${state.apiTest}
\`\`\`

**If you see a 404 or "Job not found" error above, that means the token IS working!**

The Authorization header was accepted by the server.
`;
		return <Detail markdown={markdown} />;
	}

	if (state.type === "uploading") {
		return <Detail isLoading markdown="Uploading image..." />;
	}

	if (state.type === "translating") {
		const filled = Math.floor(state.progress / 5);
		const empty = 20 - filled;
		const progressBar =
			state.progress > 0
				? `\n\n${"█".repeat(filled)}${"░".repeat(empty)} ${state.progress}%`
				: "";
		return <Detail isLoading markdown={`Translating...${progressBar}`} />;
	}

	// Ready - show translated image
	const imageMarkdown = `![Translated Image](data:${state.mimeType};base64,${state.imageBase64})`;

	return (
		<Detail
			actions={
				<ActionPanel>
					<Action
						onAction={async () => {
							// Write base64 to temp file and copy
							const tempPath = `/tmp/noll-translated-${Date.now()}.png`;
							const buffer = Buffer.from(state.imageBase64, "base64");
							await fs.writeFile(tempPath, buffer);
							await Clipboard.copy({ file: tempPath });
							await showToast({
								style: Toast.Style.Success,
								title: "Image copied to clipboard!",
							});
						}}
						shortcut={{ modifiers: [], key: "return" }}
						title="Copy Image to Clipboard"
					/>
				</ActionPanel>
			}
			markdown={imageMarkdown}
		/>
	);
}
