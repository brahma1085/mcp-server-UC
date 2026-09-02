# Architecture Document: MCP Server for Gmail & Google Docs

## 1. Executive Summary
This document outlines the architecture for a Model Context Protocol (MCP) server that provides AI agents with secure, standardized access to Google Gmail and Google Docs. The architecture ensures that the server acts as an independent, generic integration layer—abstracting away the complexities of Google APIs and OAuth 2.0 authentication, while remaining decoupled from any specific AI agent or framework.

## 2. High-Level Architecture

The system operates as a bridge between an MCP-compatible AI agent and Google's APIs. The AI agent initiates tool calls via the MCP protocol, which the MCP Server intercepts, validates, and translates into the corresponding Google API operations.

```mermaid
flowchart TD
    A[Any MCP AI Agent / Client] <-->|Model Context Protocol| B(Generic MCP Server)
    
    subgraph "MCP Server Infrastructure"
        B --> C{Tool Handlers}
        C --> D[Gmail Tools]
        C --> E[Google Docs Tools]
        
        D --> F[Services Layer]
        E --> F
        
        F --> G[Gmail Service]
        F --> H[Google Docs Service]
        F --> I[OAuth 2.0 Service]
        
        G --> J[Validation & Error Handling]
        H --> J
        
        G -.->|Rate Limiter (Bottleneck)| K
        H -.->|Rate Limiter (Bottleneck)| K
    end
    
    J -->|REST / RPC| K((Google APIs))
    K <--> L[Gmail API]
    K <--> M[Google Docs API]
```

### Design Principles
1. **Separation of Concerns:** The MCP protocol handling is strictly separated from the Google API business logic.
2. **Generic Integration:** No AI-agent-specific logic (e.g., prompt formatting, specific workflow assumptions) is embedded in the server.
3. **Security First:** OAuth credentials and tokens are managed securely and never exposed back to the AI agent.
4. **Extensibility:** The modular design allows easy addition of future Google Workspace tools (e.g., Drive, Calendar).

## 3. Directory Structure and Modularity

The codebase is organized to support modularity and easy testability.

```text
mcp-google-server/
├── src/
│   ├── server/
│   │   └── mcp_server        # Core MCP protocol transport & lifecycle management
│   ├── tools/
│   │   ├── gmail_tools       # MCP Tool definitions for Gmail operations
│   │   └── google_docs_tools # MCP Tool definitions for Docs operations
│   ├── services/
│   │   ├── gmail_service     # Business logic: MIME construction, Gmail API calls
│   │   ├── google_docs_service # Business logic: Document retrieval, batch updates
│   │   └── oauth_service     # Token management, refresh flows, scope handling
│   ├── models/
│   │   ├── gmail_models      # Data structures for emails (Drafts, Messages)
│   │   └── docs_models       # Content structure and formatting models
│   └── utils/
│       ├── validation        # JSON schema validation for incoming MCP requests
│       └── logging           # Structured, sanitized application logging
├── tests/
│   ├── unit/                 # Unit tests (mocking Google APIs)
│   └── integration/          # End-to-end tests (when credentials permit)
├── docs/                     # Documentation and architectural records
├── .env.example              # Template for required environment variables
├── Dockerfile                # Containerization specification
└── README.md                 # Setup and deployment instructions
```

## 4. Core Components

### 4.1. MCP Server & Transport Layer (`src/server/`)
- Initializes the MCP Server instance and registers the tools (`gmail_create_draft`, `gmail_send_email`, `google_docs_append_content`).
- Listens to incoming JSON-RPC requests over the selected transport (e.g., `stdio` or HTTP/SSE).
- Handles request routing to the appropriate Tool Handlers.
- **Connection Lifecycle & GC:** Manages payload limits (max 50MB to prevent memory exhaustion), SSE Keep-Alive pings (30s intervals), and Ghost Connection GC (sweeping inactive sessions every 5 minutes) to ensure optimal resource utilization on constrained free-tier environments.

### 4.2. Tool Handlers (`src/tools/`)
- Define the input and output schemas for each tool using standard JSON Schema.
- Act as the entry point for the AI agent's requests.
- Responsible for passing the validated arguments to the Services Layer and mapping the service results back to the standardized MCP tool response format.

### 4.3. Services Layer (`src/services/`)
- **Gmail Service:** Handles the construction of standards-compliant MIME messages (supporting plaintext and HTML) and interacts with the Gmail API to create drafts or send emails. Requests are queued using a `Bottleneck` rate limiter (max 5 concurrent) to prevent `429 Too Many Requests` API quota penalties.
- **Google Docs Service:** Retrieves document metadata to determine the correct insertion index, translates structured formatting requests into Google Docs `batchUpdate` requests, and appends the content safely while preserving existing text. Implements **Document Mutex Locks** (`Promise.resolve()` chaining) to prevent overlapping writes to the same document, and also utilizes the `Bottleneck` rate limiter.
- **OAuth Service:** Manages the OAuth 2.0 lifecycle. It securely loads client credentials, handles authorization flows, stores and retrieves refresh tokens, and intercepts `401 Unauthorized` responses to automatically refresh expired access tokens. It employs **Promise Deduplication** for token loads, ensuring high concurrency spikes do not trigger redundant disk I/O operations.

### 4.4. Validation & Error Handling (`src/utils/`)
- **Validation:** Enforces strict validation on all tool inputs (e.g., valid email formats, non-empty document IDs, supported formatting styles) before attempting external API calls. Implements **Regex DoS Protection** by performing fast string-length bounds checks on massive inputs (like base64 attachments) before executing expensive Regex evaluations.
- **Error Mapping:** Catches Google API errors (e.g., rate limits, permission denied `403`, not found `404`) and translates them into predictable, machine-readable MCP error responses. Sanitizes all error messages to ensure no sensitive credentials or tokens are leaked.

## 5. Data Flow Example: Appending Content to Google Docs

1. **Invocation:** The AI agent sends a JSON-RPC request to the MCP server invoking `google_docs_append_content` with a document ID, content, and formatting rules.
2. **Validation:** The Tool Handler uses JSON Schema to validate the input structure.
3. **Authentication Check:** The handler requests an authenticated Google Docs client from the OAuth Service. (If the access token is expired, the OAuth Service silently refreshes it using the stored refresh token).
4. **Metadata Retrieval:** The Google Docs Service fetches the document to find the current end index (EOF).
5. **Execution:** The Google Docs Service constructs a `batchUpdate` payload containing `insertText` and `updateTextStyle` requests, and sends it to the Google Docs API.
6. **Response Formulation:** The API responds with the operation status. The Tool Handler structures this into a sanitized, human-readable summary and returns it to the AI agent over the MCP protocol.

## 6. Security and Credential Management

- **Externalized Configuration:** All secrets (Client ID, Client Secret) are injected via environment variables.
- **Token Persistence Strategy:** The application uses a Strategy Pattern for token persistence. In local environments, a `FileTokenStorage` saves and reads from `tokens.json`. In production/containerized environments, an `EnvironmentTokenStorage` loads the refresh token directly from the `GOOGLE_REFRESH_TOKEN` environment variable, preserving the stateless nature of the container.
- **Least Privilege:** The application requests only the minimum required OAuth scopes (e.g., `https://www.googleapis.com/auth/gmail.send`, `https://www.googleapis.com/auth/documents`).
- **No Token Exposure:** The MCP Server **never** returns OAuth access tokens or client secrets in its responses to the AI agent.
- **Sanitized Logging:** Structured logs track operations and errors, but explicitly filter out PII, tokens, and full email/document bodies unless configured for explicit local debugging.

## 7. Extensibility & Future Scaling

The architecture is deliberately modular to facilitate the addition of new features without refactoring the core server:
- **Adding New Gmail Tools:** (e.g., `gmail_send_draft`, `gmail_get_message`) requires creating a new handler in `gmail_tools` and implementing the corresponding Google API call in `gmail_service`.
- **Adding New Services:** (e.g., Google Calendar) requires introducing a new `calendar_service`, defining its tools in `calendar_tools`, and registering them during server initialization. The OAuth service will simply need an updated scope list.

## 8. Deployment Architecture

The server is designed to be environment-agnostic. 
- **Local Development:** Run natively via Node.js/TypeScript using `npm run start`, leveraging `.env` for secrets and `stdio` transport for immediate integration with local AI agents.
- **Containerized Production:** Packaged via a `Dockerfile`. The container relies on the host environment's secret injection for OAuth credentials and can expose an HTTP/SSE transport for remote MCP clients. A lightweight health check endpoint can be exposed to verify server process liveness without triggering Google API calls.
