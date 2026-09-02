# Implementation Plan: MCP Server for Gmail & Google Docs

This document outlines a phase-wise implementation plan for building the generic MCP server integrating Google Gmail and Google Docs, based on the requirements and architecture defined in the project documentation.

## Phase 1: Initial Setup & Project Scaffolding
**Goal:** Establish the project foundation, directory structure, and basic MCP server configuration.

1. **Repository Setup:**
   - Initialize the project repository (e.g., using Node.js/TypeScript or Python).
   - Set up the directory structure as defined in the architecture (e.g., `src/server`, `src/tools`, `src/services`, `src/models`, `src/utils`).
   - Configure code formatting, linting, and basic tooling.

2. **Dependency Management:**
   - Install the official Google APIs client library (e.g., `googleapis` for Node.js).
   - Install a mature Model Context Protocol (MCP) SDK.
   - Install dependencies for environment variable management (e.g., `dotenv`).

3. **MCP Server Scaffolding:**
   - Implement the core MCP Server initialization in `src/server/mcp_server`.
   - Configure the chosen transport layer (e.g., `stdio` for local AI agent integration).
   - Verify the server starts successfully and can be connected to by an MCP client.

4. **Environment Configuration:**
   - Create the `.env.example` file mapping out required keys (e.g., `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`).

## Phase 2: OAuth 2.0 & Authentication Service (COMPLETED)
**Goal:** Implement secure Google OAuth 2.0 authentication to authorize Google API calls without exposing credentials to the AI agent.

1. **OAuth Service Initialization (`src/services/oauth_service`):**
   - Implement OAuth 2.0 client initialization using Google's official libraries.
   - Configure the required scopes (`https://www.googleapis.com/auth/gmail.send`, `https://www.googleapis.com/auth/documents`).

2. **Token Management & Persistence (Strategy Pattern):**
   - Implement a `TokenStorage` interface.
   - Implement `FileTokenStorage` to read/write `tokens.json` for local development.
   - Implement `EnvironmentTokenStorage` to read from `GOOGLE_REFRESH_TOKEN` environment variable for stateless production deployment.
   - Implement automatic refresh token handling for expired access tokens.

3. **Authentication Verification:**
   - Create a script (`src/scripts/auth_setup.ts`) to perform the initial OAuth consent flow to obtain the first refresh token for local development testing.

## Phase 3: Gmail Integration (Tools & Services) (COMPLETED)
**Goal:** Implement the Gmail API operations and expose them via MCP tools.

1. **Gmail Models & Validation (`src/models/` & `src/utils/validation`):**
   - Define JSON schemas for `gmail_create_draft` and `gmail_send_email`.
   - Implement input validation logic to verify required fields, email addresses, and body formats.

2. **Gmail Service (`src/services/gmail_service`):**
   - Implement MIME message construction supporting both plaintext and HTML.
   - Implement the API call to create a draft (`users.drafts.create`).
   - Implement the API call to send an email (`users.messages.send`).
   - Implement proper error handling and mapping for Gmail API errors.

3. **Gmail MCP Tools (`src/tools/gmail_tools`):**
   - Register the `gmail_create_draft` and `gmail_send_email` tools with the MCP server.
   - Map the tool requests to the `gmail_service`, execute the operation, and format the results securely for the MCP response.

## Phase 4: Google Docs Integration (Tools & Services) (COMPLETED)
**Goal:** Implement Google Docs operations with structured formatting and expose them via MCP tools.

1. **Docs Models & Validation (`src/models/` & `src/utils/validation`):**
   - Define JSON schemas for `google_docs_append_content`, including the structured formatting options (headings, bold, italic, etc.).
   - Implement input validation for Document IDs and content structures.

2. **Google Docs Service (`src/services/google_docs_service`):**
   - Implement document metadata retrieval to dynamically determine the EOF (end of file) index for appending.
   - Implement the mapping of structured formatting requests into Google Docs API `batchUpdate` requests (`insertText`, `updateTextStyle`, etc.).
   - Ensure the batch update reliably preserves existing content.
   - Implement proper error handling for Google Docs API errors (e.g., 404 Not Found, 403 Permission Denied).

3. **Google Docs MCP Tools (`src/tools/google_docs_tools`):**
   - Register the `google_docs_append_content` tool with the MCP server.
   - Map the tool requests to the `google_docs_service` and format the execution results.

## Phase 5: Testing, Validation, Error Handling & Scaling (COMPLETED)
**Goal:** Ensure the system is robust, handles errors gracefully, is safe for production use, and adheres to strict PaaS free-tier boundaries.

1. **Error Mapping (`src/utils/error_handling`):**
   - Standardize error responses to ensure no OAuth secrets or stack traces are leaked to the AI agent.
   - Handle Google API errors gracefully (e.g., mapping 403 or 404 to user-friendly messages).

2. **Scaling & Edge-Case Protections:**
   - **Rate Limiting:** Implement `Bottleneck` to queue Google API calls globally (max 5 concurrent) preventing `429 Too Many Requests`.
   - **Ghost Connection GC:** Implement a central sweep interval to kill inactive SSE sessions (>15 mins) and free up PaaS RAM limits.
   - **Payload & DoS Protection:** Configure max 50MB payload limits on the Express server and enforce pre-regex string bounds checks for base64 attachments to prevent Regex DoS.
   - **Concurrency Management:** Implement Promise deduplication for token loads in OAuthService, and Document Mutex Locks in GoogleDocsService to prevent overlapping writes.

3. **Unit Testing (`tests/unit/`):**
   - Write tests for input validation, edge cases (invalid emails, huge payloads).
   - Write tests for mapping structured formatting into `batchUpdate` requests (mocking Google APIs).
   - Ensure the queue and lock wrappers resolve correctly without regressions.

4. **Logging (`src/utils/logging`):**
   - Implement structured, sanitized logging across all services. Ensure sensitive PII and tokens are filtered out.

## Phase 6: Documentation & Deployment Preparation (COMPLETED)
**Goal:** Finalize documentation and prepare the server for generic deployment.

1. **Project Documentation:**
   - Update `README.md` with complete prerequisites, Google Cloud setup instructions, scaling context, and execution commands.
   - Document all exposed MCP tools, their parameters, and expected behaviors.
   - Create edge-case, evaluation, and scaling plans (`edge-case.md`, `eval.md`, `SCALING.md`).

2. **Deployment Configuration:**
   - Update the transport layer to HTTP/SSE for remote MCP accessibility.
   - Update `docs/deployment-plan.md` to reflect Railway PaaS integration, memory restrictions, and token injection.
   - Create a `Dockerfile` for containerized environments.

3. **Final Review:**
   - Verify that the server contains no application-specific AI agent logic and strictly adheres to the principle of a generic, robust integration layer.
