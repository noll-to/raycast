import { OAuth } from "@raycast/api";
import {
	NOLL_API_URL,
	WORKOS_AUTHORIZE_ENDPOINT,
	WORKOS_CLIENT_ID,
} from "./config";

const client = new OAuth.PKCEClient({
	redirectMethod: OAuth.RedirectMethod.Web,
	providerName: "Noll",
	providerIcon: "extension-icon.png",
	description: "Sign in to translate screenshots with Noll",
});

type TokenResponse = {
	access_token: string;
	refresh_token: string;
	expires_in: number;
};

async function exchangeCode(
	code: string,
	codeVerifier: string,
	redirectUri: string,
): Promise<TokenResponse> {
	const response = await fetch(`${NOLL_API_URL}/api/ext/auth/token`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			code,
			codeVerifier,
			redirectUri,
		}),
	});

	if (!response.ok) {
		const error = await response.text();
		throw new Error(`Token exchange failed: ${error}`);
	}

	return response.json();
}

async function refreshTokens(refreshToken: string): Promise<TokenResponse> {
	const response = await fetch(`${NOLL_API_URL}/api/ext/auth/refresh`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ refresh_token: refreshToken }),
	});

	if (!response.ok) {
		const error = await response.text();
		throw new Error(`Token refresh failed: ${error}`);
	}

	return response.json();
}

export async function getAccessToken(): Promise<string> {
	const tokenSet = await client.getTokens();

	// 1. Valid token exists - use it
	if (tokenSet?.accessToken && !tokenSet.isExpired()) {
		return tokenSet.accessToken;
	}

	// 2. Expired but has refresh token - refresh it
	if (tokenSet?.refreshToken && tokenSet.isExpired()) {
		const tokens = await refreshTokens(tokenSet.refreshToken);
		await client.setTokens(tokens);
		return tokens.access_token;
	}

	// 3. No token or no refresh token - full OAuth flow
	const authRequest = await client.authorizationRequest({
		endpoint: WORKOS_AUTHORIZE_ENDPOINT,
		clientId: WORKOS_CLIENT_ID,
		scope: "openid profile email offline_access",
		extraParameters: {
			provider: "authkit",
		},
	});

	const { authorizationCode } = await client.authorize(authRequest);

	// Exchange code via Noll API (keeps client secret server-side)
	const tokens = await exchangeCode(
		authorizationCode,
		authRequest.codeVerifier,
		authRequest.redirectURI,
	);

	await client.setTokens(tokens);
	return tokens.access_token;
}

export async function logout(): Promise<void> {
	await client.removeTokens();
}
