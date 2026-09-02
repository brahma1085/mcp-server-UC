# Edge Cases: mcp-google-server

This document outlines the known edge cases for the `mcp-google-server` based on its current implementation and interactions with Google APIs (Gmail and Google Docs).

---

## 1. Gmail Tool Edge Cases (`gmail_create_draft`, `gmail_send_email`)

### 1.1 Attachment Size Limits
* **Scenario:** An AI agent attempts to attach a file larger than 25MB (Gmail's hard limit).
* **Current Behavior:** The Gmail API will reject the payload with a `400 Bad Request` or `Payload Too Large` error. Because the payload is Base64 encoded in JSON, the JSON size might exceed Express's default limits before even reaching the Google API.
* **Mitigation Needed:** Implement explicit file size validation in the tool handler before sending the request to Google. 

### 1.2 Invalid Email Addresses
* **Scenario:** The `to`, `cc`, or `bcc` fields contain improperly formatted email addresses (e.g., missing `@`, trailing commas).
* **Current Behavior:** Google API throws an invalid request error.
* **Mitigation Needed:** Add a regex-based pre-flight validation on email strings in `handleGmailTool` to provide a clearer, immediate error message to the AI agent.

### 1.3 Malformed Base64 Attachment Data
* **Scenario:** An AI agent hallucinates or truncates the Base64 string for an attachment.
* **Current Behavior:** The `nodemailer` or Gmail API will fail to decode the attachment, resulting in a failed draft/send.
* **Mitigation Needed:** Verify Base64 padding and string validity before processing the payload.

### 1.4 Plain Text vs. HTML Mismatch
* **Scenario:** The agent generates a `body` with HTML tags (`<b>`, `<br>`) but fails to set `isHtml: true`.
* **Current Behavior:** The email sends successfully, but the recipient sees raw HTML tags.
* **Mitigation Needed:** Auto-detect common HTML tags in the `body` string and warn the agent (or automatically toggle `isHtml`), or rely on strict prompt engineering.

---

## 2. Google Docs Tool Edge Cases (`google_docs_append_content`)

### 2.1 Permission Denied or Invalid `documentId`
* **Scenario:** The agent hallucinates a `documentId` or attempts to append to a document the authenticated Google account does not have write access to.
* **Current Behavior:** A `403 Forbidden` or `404 Not Found` error is returned by the Google Docs API.
* **Mitigation Needed:** Ensure the error message passed back to the agent clearly explains that it's an access/existence issue, not a payload format issue.

### 2.2 Empty Blocks Array
* **Scenario:** The agent calls the tool with a valid `documentId` but an empty `blocks: []` array.
* **Current Behavior:** The `appendContent` function might throw a validation error or make a redundant empty API call.
* **Mitigation Needed:** Short-circuit the execution if `blocks.length === 0` and return an immediate success (or a warning) without hitting the Google API.

### 2.3 Concurrent Edits
* **Scenario:** Two different agents (or the same agent firing parallel tool calls) attempt to append to the *same* Google Doc simultaneously.
* **Current Behavior:** The Google Docs API uses index-based insertions. Concurrent edits can result in text being inserted out of order, or the API might throw a `409 Conflict` (Revision ID mismatch).
* **Mitigation Needed:** Implement a locking mechanism or a document-specific request queue in `GoogleDocsService` to serialize write operations.

---

## 3. Server & Infrastructure Edge Cases

### 3.1 PaaS Container Suspension (Railway)
* **Scenario:** Railway spins down the container due to inactivity, or restarts it during a deployment.
* **Current Behavior:** Any active SSE connection is severed abruptly. The AI agent's client will receive a connection dropped error.
* **Mitigation Needed:** Ensure the MCP client is configured to automatically reconnect and retry failed tool calls idempotently.

### 3.2 Token Expiry During In-Flight Request
* **Scenario:** The OAuth access token expires precisely after the server accepts the agent's request but before the Google API call is dispatched.
* **Current Behavior:** The `google-auth-library` attempts to refresh the token synchronously. If this refresh fails (e.g., revoked access), the tool call fails with a `401 Unauthorized`.
* **Mitigation Needed:** Handle `401` errors gracefully by prompting the system administrator to re-authenticate the application.
