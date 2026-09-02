# MCP Server for Gmail & Google Docs

This project is a Model Context Protocol (MCP) server built with **Node.js and TypeScript**, designed to provide AI agents with secure, standardized access to Google Gmail and Google Docs APIs.

## Features
- **Generic Integration**: Built to expose clear tools without agentic reasoning.
- **Secure Authentication**: Uses OAuth 2.0 with stateless refresh token support for secure CI/CD and deployment.
- **Robust Error Handling & Edge Cases**: Standardized error responses prevent leaking stack traces or PII. Incorporates 50MB payload limits, Regex DoS protection (pre-checks on base64 bodies), and strict API permission translations (e.g., 403, 404).
- **High Performance & Scaling**:
  - **Rate Limiting (`bottleneck`)**: Queues outbound Google API calls (max 5 concurrent) to prevent `429 Too Many Requests` quota exhaustion.
  - **Ghost Connection GC**: An active 5-minute Garbage Collector forcefully closes stale SSE sessions (>15 mins inactive) to preserve free-tier RAM on PaaS environments.
  - **I/O Deduplication**: Caches in-flight token loading promises to prevent redundant disk I/O during heavy concurrency spikes.
  - **Document Mutex Locks**: Edits are queued per-document ID, ensuring sequential appends and preventing structure corruption.
- **Structured Logging**: Uses `winston` for safe, redaction-enabled logging.

## Prerequisites
- **Node.js** (v18 or higher recommended)
- **npm** (v9 or higher recommended)
- **Google Cloud Console Project** with the following APIs enabled:
  - [Gmail API](https://console.cloud.google.com/apis/library/gmail.googleapis.com)
  - [Google Docs API](https://console.cloud.google.com/apis/library/docs.googleapis.com)

## Google Cloud Setup (OAuth 2.0)
1. Go to your [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project or select an existing one.
3. Navigate to **APIs & Services > Credentials**.
4. Click **Create Credentials > OAuth client ID**.
5. Select **Desktop app** (or Web application if you need strict redirect URIs).
6. Copy the `Client ID` and `Client Secret`.

## Local Setup & Authentication
1. Clone the repository and install dependencies:
   ```bash
   npm install
   ```

2. Configure environment variables:
   Copy `.env.example` to `.env` and fill in your Google OAuth 2.0 credentials:
   ```bash
   cp .env.example .env
   # Edit .env with your GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET
   ```

3. Authenticate and obtain a Refresh Token:
   Run the setup script to perform the OAuth flow:
   ```bash
   npm run auth
   ```
   *Follow the URL provided in the console, authorize the app, and paste the code back into the terminal. This will save a `tokens.json` file locally.*

4. Build the project:
   ```bash
   npm run build
   ```

5. Start the MCP server:
   ```bash
   npm run start
   ```

## Available MCP Tools

### `gmail_create_draft`
Creates a draft email in the user's Gmail account.
- **to** *(required)*: The recipient email address(es), comma-separated.
- **subject** *(required)*: The subject of the email.
- **body** *(required)*: The body content of the email.
- **isHtml**: Boolean indicating if the body is HTML.
- **cc**, **bcc**, **attachments**: Optional fields.

### `gmail_send_email`
Sends an email directly from the user's Gmail account.
- *Parameters are identical to `gmail_create_draft`.*

### `google_docs_append_content`
Appends structured, formatted text to a Google Document.
- **documentId** *(required)*: The unique ID of the Google Document (found in its URL).
- **blocks** *(required)*: An array of content blocks to insert sequentially.
  - **text** *(required)*: The text content to insert.
  - **bold**: Boolean to apply bold formatting.
  - **italic**: Boolean to apply italic formatting.
  - **heading**: String (`NORMAL_TEXT`, `TITLE`, `HEADING_1`, etc.) to apply paragraph styles.

## Production Deployment (Docker)

To deploy statelessly in a production environment (like AWS ECS, Google Cloud Run, or Kubernetes as a sidecar), you should NOT mount the `tokens.json` file. Instead, inject the refresh token via environment variables.

1. **Build the Docker Image:**
   ```bash
   docker build -t mcp-google-server .
   ```

2. **Run the Container Statelessly:**
   Ensure you provide `GOOGLE_REFRESH_TOKEN` alongside the client credentials.
   ```bash
   docker run -i \
     -e GOOGLE_CLIENT_ID="your-client-id" \
     -e GOOGLE_CLIENT_SECRET="your-client-secret" \
     -e GOOGLE_REFRESH_TOKEN="your-refresh-token" \
     mcp-google-server
   ```
   *(Note: The `-i` flag is required because the server uses `stdio` transport).*
