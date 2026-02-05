# Noll Raycast Extension - Implementation Plan

## Overview

A Raycast extension that allows users to translate screenshots instantly using Noll's image translation service.

## Architecture

```
┌─────────────────────────┐
│   Raycast Extension     │
│                         │
│  1. Read clipboard img  │
│  2. OAuth via WorkOS    │
│  3. POST to Noll API    │
│  4. Poll for completion │
│  5. Show translated img │
│  6. Enter → copy image  │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐       ┌─────────────────────────┐
│      Noll API           │       │        WorkOS           │
│                         │       │                         │
│  POST /api/ext/token    │◄──────│  Token exchange         │
│  POST /api/ext/translate│       │  (validates PKCE)       │
│  GET  /api/ext/job/:id  │       │                         │
└───────────┬─────────────┘       └─────────────────────────┘
            │
            ▼
┌─────────────────────────┐
│   Azure Document        │
│   Translation           │
│   (preview API for img) │
└─────────────────────────┘
```

## Noll API Endpoints (To Be Implemented)

### 1. `POST /api/ext/auth/token`

Exchange OAuth authorization code for tokens. Wraps WorkOS token exchange to keep client secret server-side.

**Request:**

```json
{
  "code": "string",
  "codeVerifier": "string",
  "redirectUri": "string"
}
```

**Response:**

```json
{
  "access_token": "string",
  "refresh_token": "string",
  "expires_in": 3600
}
```

### 2. `POST /api/ext/auth/refresh`

Refresh an expired access token.

**Request:**

```json
{
  "refresh_token": "string"
}
```

**Response:**

```json
{
  "access_token": "string",
  "refresh_token": "string",
  "expires_in": 3600
}
```

### 3. `POST /api/ext/translate`

Start an image translation job. Requires Bearer token authentication.

**Request:** `multipart/form-data`

- `image`: File (the image to translate)
- `targetLanguage`: string ("en", "de", etc.)

**Response:**

```json
{
  "jobId": "string"
}
```

### 4. `GET /api/ext/job/:jobId`

Poll job status. Requires Bearer token authentication.

**Response:**

```json
{
  "status": "pending" | "processing" | "ready" | "failed",
  "progress": 0-100,
  "result": {
    "image": "base64-encoded-string",
    "detectedLanguage": "de"
  },
  "error": "string (if failed)"
}
```

## OAuth Flow

1. Raycast extension initiates PKCE flow with WorkOS
2. User authenticates via WorkOS AuthKit in browser
3. WorkOS redirects to `https://raycast.com/redirect?packageName=noll`
4. Raycast receives authorization code
5. Extension calls Noll's `/api/ext/auth/token` with code + PKCE verifier
6. Noll exchanges code with WorkOS (using client secret server-side)
7. Noll returns access + refresh tokens to extension
8. Extension stores tokens via Raycast's `OAuth.PKCEClient.setTokens()`

## Token Refresh Flow

1. Extension checks `tokenSet.isExpired()` before API calls
2. If expired, calls `/api/ext/auth/refresh` with refresh token
3. Noll calls WorkOS refresh endpoint
4. New tokens returned and stored in extension

## WorkOS Configuration Required

Add redirect URI to WorkOS dashboard:

```
https://raycast.com/redirect?packageName=noll
```

## Implementation Checklist

### Noll API (in `noll` repo)

- [x] `POST /api/ext/auth/token` - Exchange OAuth code for tokens
- [x] `POST /api/ext/auth/refresh` - Refresh expired tokens
- [x] `POST /api/ext/translate` - Start image translation job
- [x] `GET /api/ext/job/[jobId]` - Poll job status
- [x] Bearer token validation middleware
- [ ] Add redirect URI to WorkOS dashboard

### Raycast Extension (this repo)

- [x] Project scaffold with package.json, tsconfig
- [x] OAuth flow implementation (`src/lib/oauth.ts`)
- [x] Noll API client (`src/lib/noll-api.ts`)
- [x] Main translate command (`src/translate-clipboard.tsx`)
- [x] Get actual WorkOS client ID and update `src/lib/config.ts`
- [ ] Test end-to-end flow
- [ ] Add extension icon (`assets/extension-icon.png`)
- [ ] Publish to Raycast store (optional)

## File Structure

```
noll-raycast/
├── package.json           # Extension manifest
├── tsconfig.json          # TypeScript config
├── assets/
│   └── extension-icon.png # Extension icon (TODO)
├── src/
│   ├── translate-clipboard.tsx  # Main command
│   └── lib/
│       ├── config.ts      # API URLs, WorkOS client ID
│       ├── oauth.ts       # OAuth PKCE flow
│       └── noll-api.ts    # Noll API client
```

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build
npm run build

# Lint
npm run lint
```
