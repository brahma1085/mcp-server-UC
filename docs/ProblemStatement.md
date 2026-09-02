# MCP SERVER – GMAIL & GOOGLE DOCS INTEGRATION

DOCUMENT: problemStatement.txt PURPOSE: Development specification for
Antigravity / Cursor / AI coding agents

## 1. PROJECT OVERVIEW

Build a production-ready, generic Model Context Protocol (MCP) server
that enables AI agents to interact with Google Gmail and Google Docs
through well-defined MCP tools.

The MCP server must expose reusable capabilities rather than being
tightly coupled to one specific AI agent or application.

The initial scope contains two core capabilities:

1.  Gmail
    -   Draft an email
    -   Send an email
2.  Google Docs
    -   Append content to an existing Google Doc
    -   Apply proper document formatting while appending

The resulting MCP server should be usable by the user’s current AI agent
as well as other MCP-compatible AI agents and clients.

## 2. PRIMARY OBJECTIVES

The system must:

-   Implement a standards-compliant MCP server.
-   Provide clear, discoverable MCP tools.
-   Authenticate securely with Google APIs using OAuth 2.0.
-   Support Gmail operations without exposing Google credentials to the
    AI agent.
-   Support Google Docs append operations with structured formatting.
-   Return useful, machine-readable responses to the calling AI agent.
-   Validate all tool inputs before calling Google APIs.
-   Handle authentication, authorization, API errors, validation errors,
    rate limits, and transient failures gracefully.
-   Keep the architecture modular so additional Google services/tools
    can be added later.
-   Avoid application-specific business logic inside the MCP server.
-   Be generic enough for multiple AI agents and MCP clients.
-   Provide clear setup, configuration, testing, and deployment
    documentation.

## 3. FUNCTIONAL REQUIREMENTS

3.1 GMAIL – DRAFT EMAIL

The MCP server must expose an MCP tool for creating an email draft in
Gmail.

Suggested tool name:

```text
gmail_create_draft
```

The tool should support at least:

-   recipient(s)
-   CC recipient(s)
-   BCC recipient(s)
-   subject
-   email body
-   body format: plain text or HTML
-   optional reply/thread information where supported
-   optional attachments, if implemented as part of the extensible
    design

Example conceptual input:

```json
{ "to": ["user@example.com"], "cc": [], "bcc": [], "subject": "Project
Update", "body": "The project update is ready.", "body_format": "text" }
```

Expected behavior:

1.  Validate the input.
2.  Validate email addresses.
3.  Construct a standards-compliant MIME email.
4.  Authenticate with Gmail using the configured OAuth credentials.
5.  Create the draft using the Gmail API.
6.  Return the Gmail draft identifier and useful status information.
7.  Never expose OAuth access tokens, refresh tokens, client secrets, or
    other credentials in the response.

3.2 GMAIL – SEND EMAIL

The MCP server must expose an MCP tool for sending an email through
Gmail.

Suggested tool name:

```text
gmail_send_email
```

The tool should support:

-   recipient(s)
-   CC recipient(s)
-   BCC recipient(s)
-   subject
-   email body
-   body format: plain text or HTML
-   optional reply/thread information where supported
-   optional attachments, if implemented

Expected behavior:

1.  Validate all required inputs.
2.  Validate email addresses.
3.  Construct the MIME message.
4.  Authenticate using OAuth 2.0.
5.  Send the message through the Gmail API.
6.  Return a success response containing the Gmail message identifier
    and thread identifier where available.
7.  Do not return credentials or sensitive OAuth information.

3.3 OPTIONAL GMAIL – SEND EXISTING DRAFT

The architecture should allow a future tool such as:

```text
gmail_send_draft
```

This is recommended as an extension because an AI agent may first create
a draft and, after user confirmation, send the draft.

If implemented, the tool should accept a Gmail draft ID, validate it,
and send the corresponding draft.

3.4 GOOGLE DOCS – APPEND CONTENT

The MCP server must expose an MCP tool that appends content to an
existing Google Doc.

Suggested tool name:

```text
google_docs_append_content
```

The tool should accept:

-   Google Doc ID
-   content to append
-   content type / structure
-   formatting instructions
-   optional insertion behavior
-   optional metadata where useful

Example conceptual input:

```json
{ "document_id": "GOOGLE_DOC_ID", "content": "Project StatusAPI
integration.", "format": { "paragraph_style": "NORMAL_TEXT" } }
```

Expected behavior:

1.  Validate the document ID.

2.  Authenticate with Google Docs API.

3.  Retrieve enough document metadata to determine the valid insertion
    position.

4.  Append the supplied content at the end of the document.

5.  Apply requested formatting.

6.  Preserve existing document content and formatting.

7.  Return the document ID and details of the appended operation.

8.  Handle empty documents and documents containing existing content
    correctly.

## 4. GOOGLE DOCS FORMATTING REQUIREMENTS

Formatting is an important requirement. The MCP server must not simply
append unformatted plain text when structured formatting is requested.

The design should support a reusable formatting model, including where
practical:

-   Normal paragraph
-   Heading 1
-   Heading 2
-   Heading 3
-   Bold
-   Italic
-   Underline
-   Strikethrough
-   Font size
-   Text alignment
-   Ordered lists
-   Unordered/bullet lists
-   Line breaks
-   Paragraph spacing where supported
-   Links
-   Basic text styling

A structured content representation is preferred over trying to
interpret arbitrary formatting from natural-language instructions.

For example, the server may support a content structure conceptually
similar to:

```json
{ "document_id": "GOOGLE_DOC_ID", "content": [ { "type": "heading",
"level": 1, "text": "Project Update" }
```, ```json
{ "type": "paragraph", "text":
"The API implementation is complete." }
```, ```json
{ "type": "bullet_list",
"items": [ "Gmail integration completed", "Google Docs integration
completed" ] }
``` ] }

The exact schema may be improved by the implementation agent, but it
must remain:

-   Simple for AI agents to construct.
-   Deterministic.
-   Explicit.
-   Validatable.
-   Extensible.
-   Independent of one particular AI framework.

## 5. MCP TOOL DESIGN

All functionality must be exposed through MCP tools with clear names,
descriptions, input schemas, and output schemas.

The tool descriptions should explain:

-   What the tool does.
-   When an AI agent should use it.
-   Required parameters.
-   Optional parameters.
-   Expected formats.
-   Important side effects.
-   Errors that may occur.
-   Whether the operation modifies external data.

The MCP server should use structured JSON-compatible input and output.

Do not require the AI agent to understand internal Google API request
structures.

The MCP server is responsible for translating the generic MCP tool
request into the appropriate Google API operations.

## 6. RECOMMENDED INITIAL TOOL SET

At minimum implement:

1.  gmail_create_draft
2.  gmail_send_email
3.  google_docs_append_content

Recommended future/extensible tools:

4.  gmail_send_draft
5.  gmail_get_message
6.  gmail_search_messages
7.  google_docs_get_document
8.  google_docs_replace_content
9.  google_docs_insert_content

Only implement additional tools if they do not unnecessarily increase
the initial project complexity.

## 7. AUTHENTICATION AND AUTHORIZATION

Use Google OAuth 2.0.

The implementation must:

-   Never hard-code Google client IDs or client secrets.
-   Never hard-code access tokens or refresh tokens.
-   Never commit credentials to source control.
-   Load configuration through environment variables or a secure
    configuration mechanism.
-   Store refresh tokens securely.
-   Request only the minimum Google API scopes required.
-   Clearly document all required OAuth scopes.
-   Handle expired access tokens by refreshing them through the OAuth
    mechanism.
-   Provide a clear authentication/setup flow.
-   Separate authentication logic from Gmail and Google Docs business
    logic.

Potential scopes should be evaluated carefully. Use the least-privilege
scopes required for the implemented operations.

## 8. CONFIGURATION

Configuration should be externalized.

At minimum support configuration for:

-   Google OAuth client ID
-   Google OAuth client secret
-   OAuth redirect URI
-   Token storage location or token provider
-   MCP server host
-   MCP server port
-   Logging level
-   Environment/deployment mode

Use a .env file only for local development where appropriate.

Provide:

    .env.example

Do not include real secrets in .env.example.

## 9. SECURITY REQUIREMENTS

Security is a first-class requirement.

The implementation must:

-   Never log access tokens.
-   Never log refresh tokens.
-   Never log Google client secrets.
-   Avoid unnecessarily logging complete email bodies or document
    content.
-   Sanitize sensitive information in error messages.
-   Validate and sanitize tool inputs.
-   Protect OAuth callback endpoints.
-   Use HTTPS in production deployments.
-   Apply appropriate authorization checks.
-   Avoid arbitrary URL/file access unless explicitly implemented and
    secured.
-   Prevent prompt/tool input from being interpreted as executable code.
-   Keep credentials outside source control.
-   Provide secure token persistence.
-   Document security assumptions and limitations.

## 10. GENERIC MCP SERVER REQUIREMENT

The MCP server must not contain logic specific to the current AI agent.

Do NOT implement assumptions such as:

-   A particular AI model.
-   A particular agent framework.
-   A particular prompt format.
-   A particular UI.
-   A particular application workflow.
-   A hard-coded user identity.
-   A hard-coded Gmail address.
-   A hard-coded Google Doc.

Any MCP-compatible client should be able to discover the tools and call
them using their documented schemas.

The server should behave as a reusable integration layer:

    AI Agent / MCP Client
            |
            v
       MCP Server
        /       \
       v         v
    Gmail API  Google Docs API

## 11. ERROR HANDLING

Errors must be predictable and useful to the AI agent.

Handle at least:

-   Missing required parameters
-   Invalid parameter types
-   Invalid email addresses
-   Empty email subject/body where not allowed
-   Invalid Google Doc ID
-   Authentication failure
-   Authorization failure
-   Expired/invalid OAuth credentials
-   Google API errors
-   Document not found
-   Permission denied
-   Rate limiting
-   Network failures
-   Temporary Google API failures
-   Invalid formatting instructions
-   Unsupported formatting options

Return structured error information rather than raw stack traces.

Errors should clearly indicate:

-   operation that failed
-   error category
-   human-readable message
-   whether retrying may help

Never expose secrets in error messages.

## 12. IDEMPOTENCY AND SIDE EFFECTS

Sending an email and modifying a Google Doc are external side-effecting
operations.

The tool descriptions must clearly identify these side effects.

The implementation should consider duplicate execution.

For operations where duplicate execution is possible, design an optional
idempotency mechanism or operation identifier where practical.

At minimum:

-   Do not silently retry a send operation in a way that could cause
    duplicate emails.
-   Carefully distinguish safe retries from unsafe retries.
-   Document retry behavior.

## 13. LOGGING

Implement structured application logging.

Logs should help diagnose:

-   Tool invocation
-   Validation failures
-   Authentication events
-   Google API failures
-   Operation duration
-   Success/failure status

Do not log:

-   OAuth tokens
-   Client secrets
-   Full email contents unless explicitly enabled for local debugging
-   Full Google document contents
-   Sensitive personal data unnecessarily

Provide configurable log levels such as:

-   ERROR
-   WARN
-   INFO
-   DEBUG

## 14. OBSERVABILITY

The architecture should make it possible to add:

-   Request correlation IDs
-   Tool execution duration
-   API call metrics
-   Error counts
-   Authentication failure metrics

Observability should not compromise user data or credentials.

## 15. PROJECT ARCHITECTURE

Use a clean modular architecture.

A recommended structure is:

```text
    mcp-google-server/
    |
    +-- src/
    |   +-- server/
    |   |   +-- mcp_server
    |   |
    |   +-- tools/
    |   |   +-- gmail_tools
    |   |   +-- google_docs_tools
    |   |
    |   +-- services/
    |   |   +-- gmail_service
    |   |   +-- google_docs_service
    |   |   +-- oauth_service
    |   |
    |   +-- models/
    |   |   +-- gmail_models
    |   |   +-- docs_models
    |   |
    |   +-- utils/
    |       +-- validation
    |       +-- logging
    |
    +-- tests/
    |   +-- unit/
    |   +-- integration/
    |
    +-- docs/
    |
    +-- .env.example
    +-- README.md
    +-- problemStatement.txt
```

The selected language and framework is Node.js with TypeScript. The architecture must maintain separation between:

-   MCP protocol handling
-   Tool definitions
-   Input/output schemas
-   Google authentication
-   Gmail integration
-   Google Docs integration
-   Validation
-   Error handling
-   Configuration
-   Logging

## 16. TECHNOLOGY REQUIREMENTS

The implementation uses the official `@modelcontextprotocol/sdk` for Node.js and the official
`googleapis` client library for TypeScript/Node.js.

Preferred characteristics:

-   Official Google APIs
-   Official or well-maintained MCP SDK
-   Strong schema validation
-   Good async support where appropriate
-   Strong testing ecosystem
-   Easy local development
-   Easy deployment

Do not build the MCP protocol implementation from scratch if a reliable
MCP SDK is available.

## 17. MCP TRANSPORT

The server should support a transport appropriate for modern MCP
clients.

The implementation should document:

-   Local development transport
-   Production transport
-   How an MCP client connects
-   Server startup command
-   Required environment variables
-   Authentication flow

If multiple transports are supported by the selected MCP SDK, use the
simplest secure approach initially and keep the architecture extensible.

## 18. GOOGLE DOC APPEND ALGORITHM

The implementation must correctly determine where to append content.

Do not assume a hard-coded document index.

The server should:

1.  Retrieve the document structure or required metadata.
2.  Determine the current end index.
3.  Build the required Google Docs batchUpdate requests.
4.  Insert the content at the correct location.
5.  Apply formatting requests to the inserted content.
6.  Execute the batch update.
7.  Return a structured result.

The implementation must account for:

-   Empty documents
-   Existing paragraphs
-   Existing headings
-   Existing lists
-   Existing formatting
-   Multiple append operations

## 19. EMAIL MIME HANDLING

The Gmail integration must construct valid MIME messages.

Support:

-   Plain text
-   HTML

The implementation should correctly encode:

-   Unicode characters
-   Subject headers
-   Recipient addresses
-   Multipart content where applicable

If attachments are implemented, use safe MIME construction and validate
attachment inputs.

## 20. RESPONSE FORMAT

Tool responses should be concise but useful for AI agents.

Successful Gmail draft response should contain information such as:

-   success
-   operation
-   draft_id
-   message_id, if available
-   thread_id, if available
-   human-readable message

Successful Gmail send response should contain:

-   success
-   operation
-   message_id
-   thread_id, if available
-   human-readable message

Successful Google Docs append response should contain:

-   success
-   operation
-   document_id
-   appended content summary or character count
-   formatting status
-   human-readable message

Do not return unnecessary sensitive information.

## 21. INPUT VALIDATION

Use strict schemas.

Examples of validation:

-   Required strings must not be empty.
-   Email addresses must be valid.
-   Arrays must contain valid values.
-   Formatting values must belong to supported options.
-   Document IDs must be non-empty.
-   Content must not exceed configured limits without a clear error.
-   Unknown or unsupported fields should be handled consistently.

The implementation should provide descriptive validation errors.

## 22. TESTING REQUIREMENTS

Create automated tests.

Unit tests should cover:

-   Input validation
-   Email MIME generation
-   HTML/plain-text handling
-   Google Docs request generation
-   Formatting request generation
-   Error mapping
-   Authentication service behavior
-   Configuration validation

Integration tests should cover, where credentials/test infrastructure
permit:

-   Gmail draft creation
-   Gmail email sending
-   Google Docs append
-   Google Docs formatting
-   OAuth authentication
-   Permission errors
-   Invalid resource IDs

Do not send real emails during ordinary unit tests.

Provide mocks/fakes for Google APIs.

Tests should be safe to execute repeatedly.

## 23. LOCAL DEVELOPMENT

Provide clear setup instructions.

The README must explain:

1.  Prerequisites

2.  Google Cloud project creation

3.  Required APIs

4.  OAuth consent configuration

5.  OAuth credentials creation

6.  Required scopes

7.  Environment configuration

8.  Installing dependencies

9.  Starting the MCP server

10. Connecting an MCP client

11. Running tests

12. Troubleshooting authentication

13. Troubleshooting Google API permissions

## 14. GOOGLE CLOUD REQUIREMENTS

Document which Google APIs must be enabled.

At minimum evaluate:

-   Gmail API
-   Google Docs API

If the implementation requires Google Drive API for document
access/metadata, explicitly document why and which scope is required.

Use the smallest practical set of API scopes.

## 25. USER CONFIRMATION / SAFETY

Because sending an email is an external side effect, the MCP tool
description must make this clear to AI agents.

The server itself should not assume that an AI agent has obtained user
confirmation unless the calling protocol/application provides that
mechanism.

The MCP tool should clearly distinguish:

-   Creating a draft – reversible/low-risk operation.
-   Sending an email – external side effect.
-   Appending to a Google Doc – modifies persistent external content.

Do not introduce hidden automatic sending behavior.

## 26. RATE LIMITING AND RETRIES

The implementation should handle Google API rate limits gracefully.

Recommended behavior:

-   Respect HTTP 429 and relevant transient 5xx responses.
-   Use bounded retries with exponential backoff for safe operations.
-   Avoid blindly retrying side-effecting email sends.
-   Return a retryable/non-retryable classification when possible.
-   Avoid excessive API calls.

## 27. PERFORMANCE

The server should be lightweight and responsive.

Requirements:

-   Avoid unnecessary Google API calls.
-   Reuse authenticated clients where safe.
-   Avoid repeatedly fetching large documents when only the end position
    is needed.
-   Keep tool responses compact.
-   Avoid blocking operations unnecessarily.
-   Support concurrent requests safely if the chosen MCP/runtime
    architecture allows it.

## 28. EXTENSIBILITY

The architecture must make it straightforward to add additional Google
integrations later.

Potential future integrations:

-   Google Drive
-   Google Sheets
-   Google Calendar
-   Google Slides

New integrations should be implemented as independent services/tools
without rewriting the MCP server core.

The design should also allow future non-Google integrations if desired.

## 29. DOCUMENTATION REQUIREMENTS

Create comprehensive documentation covering:

-   Project overview
-   Architecture
-   Supported MCP tools
-   Tool input/output schemas
-   Authentication
-   Google Cloud setup
-   Environment variables
-   Local setup
-   MCP client configuration
-   Testing
-   Error handling
-   Security
-   Deployment
-   Troubleshooting
-   Extension/development guidelines

Include example MCP tool calls and expected responses.

## 30. DEPLOYMENT

The application should be deployable outside a developer laptop.

Document a production deployment approach.

The implementation should be compatible with containerized deployment
where practical.

Provide:

-   Dockerfile if appropriate
-   Production environment configuration
-   Health/readiness approach if applicable
-   Secure secret configuration guidance
-   Logging guidance
-   Deployment instructions

Do not hard-code assumptions about a specific cloud provider.

## 31. HEALTH CHECK

If supported by the selected MCP transport/server architecture, expose a
lightweight health check that verifies that the server process is
operational.

The health check should not require performing an external Gmail or
Google Docs API operation on every request.

## 32. NON-FUNCTIONAL REQUIREMENTS

The MCP server must be:

-   Secure
-   Generic
-   Modular
-   Maintainable
-   Testable
-   Observable
-   Extensible
-   Well documented
-   Production-ready
-   Compatible with MCP clients
-   Independent of any particular AI model or agent framework

## 33. OUT OF SCOPE FOR INITIAL VERSION

Unless specifically required during implementation, do not include:

-   Gmail inbox UI
-   Google Docs UI
-   User management portal
-   Admin dashboard
-   Multi-tenant billing
-   Email analytics
-   Email scheduling
-   Automatic email classification
-   RAG/vector database
-   LLM inference inside the MCP server
-   Prompt engineering framework
-   AI-agent orchestration logic
-   Complex attachment storage service

The MCP server is an integration layer, not the AI agent itself.

## 34. ACCEPTANCE CRITERIA

The project is considered complete when all of the following are true:

1.  The MCP server starts successfully using documented configuration.

2.  An MCP-compatible client can discover the available tools.

3.  gmail_create_draft can create a Gmail draft successfully.

4.  gmail_send_email can send an email successfully.

5.  google_docs_append_content can append content to an existing Google
    Doc.

6.  Google Docs content can be appended with supported formatting.

7.  OAuth authentication works without exposing credentials.

8.  Invalid inputs produce structured validation errors.

9.  Google API failures produce safe, useful errors.

10. Sensitive credentials are never written to logs.

11. Unit tests are included and pass.

12. Integration-test strategy is documented.

13. README contains complete setup instructions.

14. .env.example contains all required configuration keys without
    secrets.

15. The MCP server is not coupled to one specific AI agent.

16. The architecture allows additional MCP tools/integrations to be
    added later.

17. Sending an email is treated as an explicit external side effect and
    is never triggered implicitly.

18. Google Docs append operations preserve existing document content.

## 19. IMPLEMENTATION GUIDANCE FOR ANTIGRAVITY

Use this problem statement as the source of truth for implementation.

Before writing code:

1.  Analyze the requirements.
2.  Selected Node.js with TypeScript and the official MCP SDK.
3.  Verify the current MCP SDK/API usage and official Google API client
    libraries.
4.  Design the project structure.
5.  Define the MCP tool schemas.
6.  Define authentication and token management.
7.  Define error-handling strategy.
8.  Define the Google Docs formatting model.
9.  Create a test strategy.
10. Then implement incrementally.

Do not silently remove requirements.

If a requirement conflicts with an SDK limitation, document the
limitation and implement the closest standards-compliant solution.

Prefer official documentation and maintained libraries.

Do not over-engineer the initial implementation, but keep clear
extension points.

The final implementation should be something another developer can
clone, configure, authenticate, run, test, and connect to an
MCP-compatible AI agent without needing to understand the internal
Google API implementation.

## 36. EXPECTED DELIVERABLES

The implementation should produce, at minimum:

-   Complete MCP server source code
-   Gmail integration
-   Google Docs integration
-   OAuth authentication implementation
-   Input/output schemas
-   Error handling
-   Unit tests
-   Integration-test scaffolding or documented integration tests
-   .env.example
-   README.md
-   Architecture documentation
-   API/tool documentation
-   Dockerfile where appropriate
-   Configuration documentation
-   Secure logging implementation

## 37. FINAL DESIGN PRINCIPLE

The MCP server should act as a secure, generic bridge:

```text
    +----------------------+
    |   Any MCP AI Agent   |
    +----------+-----------+
               |
               | MCP
               v
    +----------------------+
    | Generic MCP Server   |
    |                      |
    | Gmail Tools          |
    | Google Docs Tools    |
    | OAuth Service        |
    | Validation           |
    | Error Handling       |
    +-----+-----------+----+
          |           |
          v           v
    +---------+   +-------------+
    | Gmail   |   | Google Docs |
    | API     |   | API         |
    +---------+   +-------------+
```

The AI agent decides when to invoke a tool. The MCP server securely
executes the requested operation. Google APIs remain behind the MCP
server. No AI-agent-specific business logic should be embedded in the
server.

END OF PROBLEM STATEMENT
