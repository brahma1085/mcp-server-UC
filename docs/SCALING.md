# Scaling and Performance Strategy: mcp-google-server

This document outlines the performance constraints and scaling strategies for the `mcp-google-server` when deployed in a production environment (like Railway, AWS ECS, or Google Cloud Run) and exposed to a large number of concurrent users or AI agents.

---

## 1. Stateful SSE Connections & Horizontal Scaling

### The Challenge
The MCP server relies on Server-Sent Events (SSE) to maintain a persistent connection with clients. Currently, active transport sessions are stored in-memory within the Node.js process:
```typescript
const transports = new Map<string, SSEServerTransport>();
```
If the application auto-scales horizontally across multiple container instances, a client might establish an SSE stream (`GET /sse`) on Instance A, but a load balancer might route their subsequent message (`POST /message`) to Instance B. This will result in a `404 Transport not found` error because Instance B does not have the transport in its memory.

### The Strategy
* **Short-Term (Sticky Sessions):** Configure the load balancer (or PaaS network settings) to use session affinity (Sticky Sessions). This ensures that all requests from a specific client IP or session cookie are consistently routed to the same container instance.
* **Long-Term (Pub/Sub Backplane):** Decouple the SSE connection state from the individual Node.js instances. Implement a Redis Pub/Sub backplane so that when a `POST /message` hits any instance, the message is broadcasted via Redis and the specific instance holding the open SSE socket can intercept it and send it to the client.

---

## 2. Google API Quotas and Rate Limiting

### The Challenge
The current `EnvironmentTokenStorage` implementation utilizes a single `GOOGLE_REFRESH_TOKEN`. This means the server acts on behalf of a single Google account. If hundreds of users or agents query the server simultaneously, all requests to the Gmail and Google Docs APIs are funneled through that single account and GCP Project.

Google enforces strict limits (e.g., Gmail API usage is limited to 250 quota units per user per second). Heavy concurrent usage will quickly exhaust these limits, resulting in `429 Too Many Requests` errors.

### The Strategy
* **Throttling and Queuing:** Introduce a queuing mechanism (e.g., using `bottleneck` or `p-queue`) to throttle outgoing requests to Google APIs. Implement exponential backoff and retry logic for 429 and 500-level errors.
* **Multi-Tenancy:** If the application is meant to act on behalf of the end-users (users bringing their own Google accounts), the `OAuthService` must be refactored to:
  * Store and retrieve user-specific refresh tokens securely from a database (e.g., PostgreSQL).
  * Map incoming requests to the specific user's tokens using authentication headers (e.g., JWT).

---

## 3. Connection Lifecycle & Memory Management

### The Challenge
While the server cleans up connections on explicit termination (`req.on('close')`), network instability or hard client crashes can leave "ghost" TCP connections open on the server. Because SSE is a one-way street (Server to Client), the server might not realize the client has disconnected until it attempts to write to the socket. These ghost connections will leak memory (the `Server` instance and the `SSEServerTransport`).

### The Strategy
* **Application-Level Heartbeats:** Implement a periodic ping/pong or heartbeat mechanism sent over the SSE stream.
* **Garbage Collection:** Periodically sweep the `transports` Map. Forcefully terminate and delete any sessions that have been idle or haven't responded to a heartbeat within a configurable timeout window (e.g., 60 seconds).

---

## 4. Event Loop Blocking & Payload Management

### The Challenge
Node.js operates on a single event loop. Synchronously parsing massive payloads—such as Base64 encoded email attachments or extremely large Google Docs structures—will block the event loop. This blocks all other asynchronous operations, drastically increasing latency for every other user connected to that server instance.

### The Strategy
* **Payload Limits:** Configure Express to strictly limit incoming payload sizes:
  ```typescript
  app.post("/message", express.json({ limit: "5mb" }), async (req, res) => { ... });
  ```
* **Streaming for Large Data:** If processing large email attachments is required, implement Node.js Streams to process data in chunks rather than loading entire buffers into memory simultaneously.
* **Worker Threads:** Offload heavy CPU-bound tasks (like intense JSON serialization/deserialization or data transformation) to Node.js `worker_threads`.

---

## 5. Token Management & Auth Overhead

### The Challenge
The `google-auth-library` automatically refreshes access tokens when they expire (typically every 1 hour). Under high concurrency, if a token expires, multiple parallel incoming requests could trigger a race condition, sending redundant refresh requests to Google's OAuth servers and potentially corrupting the `TokenStorage` write operations.

### The Strategy
* **Promise Deduplication (Memoization):** Wrap the token refresh logic in a singleton promise. If a refresh is already in progress, subsequent requests should `await` the in-flight promise rather than triggering their own refresh HTTP calls.
* **Proactive Refreshing:** Run a background worker that checks token expiry and proactively refreshes the access token 5 minutes before it officially expires, ensuring user requests never block waiting for an OAuth handshake.
