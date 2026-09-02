# Node.js & TypeScript Coding Conventions

This document outlines the standard coding conventions, best practices, and architectural guidelines for this Node.js and TypeScript project. Adhering to these standards ensures consistency, maintainability, and scalability.

## 1. Architecture & Code Organization
- **Separation of Concerns**: Keep business logic separate from transport layers (e.g., Express routes, MCP handlers).
  - `src/server/`: Handles server initialization and connection lifecycle.
  - `src/tools/`: Defines specific external tools/endpoints exposed to the client.
  - `src/services/`: Contains the core business logic and API integrations (e.g., GmailService, OAuthService).
  - `src/utils/`: Shared utilities, loggers, and helpers.
- **Dependency Injection**: Pass dependencies (like services or configurations) through constructors rather than instantiating them tightly inside classes.

## 2. TypeScript & Type Safety
- **Strict Mode**: Always run TypeScript with `"strict": true`.
- **Avoid `any`**: Use specific types, `unknown`, or generic type parameters `T`. Only use `any` when dealing with strictly untyped dynamic external payloads where `unknown` is too restrictive.
- **Interfaces vs. Types**: 
  - Use `interface` for object shapes and class contracts (as they are extensible).
  - Use `type` for unions, intersections, and aliases.
- **Explicit Returns**: Explicitly define return types on all functions and class methods to prevent unintended return values.

## 3. Asynchronous Programming
- **Async/Await**: Use `async/await` syntax instead of raw `.then() / .catch()` chains for better readability.
- **Concurrent Execution**: Use `Promise.all()` or `Promise.allSettled()` when executing multiple independent asynchronous tasks to reduce execution time.
- **Error Propagation**: Allow async errors to bubble up to a boundary where they can be properly handled (like an Express error middleware or an MCP tool catch block).

## 4. Error Handling
- **Graceful Degradation**: Never let the Node.js process crash due to unhandled promise rejections.
- **Structured Error Logging**: Use a centralized logging mechanism (like Winston or Pino) instead of generic `console.error`. Include context objects.
- **Custom Error Classes**: Use custom error classes (e.g., `AuthenticationError`, `ValidationError`) rather than throwing generic `Error` strings.

## 5. Naming Conventions
- **Files and Directories**: Use `snake_case` (e.g., `mcp_server.ts`) for file and directory names.
- **Classes and Interfaces**: Use `PascalCase` (e.g., `McpGoogleServer`, `OAuthService`).
- **Variables and Functions**: Use `camelCase` (e.g., `handleGmailTool`, `tokenStorage`).
- **Constants**: Use `UPPER_SNAKE_CASE` for global, immutable constants (e.g., `GMAIL_CREATE_DRAFT_TOOL`).
- **Booleans**: Prefix boolean variables with `is`, `has`, or `should` (e.g., `isHtml`, `hasToken`).

## 6. Security Standards
- **Secrets Management**: Never commit hardcoded secrets, API keys, or tokens. Always use `.env` files and `process.env`.
- **Environment Parsing**: Use `dotenv` for localized execution and ensure sensitive variables are properly sanitized in logs.
- **Input Validation**: Validate all inputs from external clients before processing them (e.g., via Zod or standard JSON schema validation).

## 7. Formatting & Linting
- **Prettier**: Code should be formatted automatically using Prettier. 
- **ESLint**: Ensure all code passes linting rules without overriding rule configurations inline unless absolutely necessary.
- **Imports**: Organize imports logically. Group external libraries first, followed by internal modules.

## 8. State & Side Effects
- **Statelessness**: Design server components to be as stateless as possible. For protocols requiring state (like SSE), scope the state safely (e.g., using isolated maps scoped by `sessionId` instead of global singletons).
- **Pure Functions**: Favor pure functions for data transformations to make unit testing easier and side effects predictable.
