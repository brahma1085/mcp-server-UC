export class AppError extends Error {
  public statusCode?: number;
  public isTransient: boolean;

  constructor(
    message: string,
    statusCode?: number,
    isTransient: boolean = false,
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.isTransient = isTransient;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400, false);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string) {
    super(message, 401, false);
  }
}

export function standardizeError(error: unknown): string {
  // Check if it's an API Error from googleapis
  if (error && typeof error === "object" && "response" in error) {
    const apiError = error as any;
    if (apiError.response && apiError.response.status) {
      const status = apiError.response.status;
      const message =
        apiError.response.data?.error?.message || apiError.message;

      if (status === 429) {
        return `Rate limit exceeded (HTTP 429). Please try again later.`;
      }
      if (status === 401 || status === 403) {
        return `Authentication or permission error (HTTP ${status}). The server is not authorized to perform this action.`;
      }
      if (status === 404) {
        return `Resource not found (HTTP 404).`;
      }
      return `External API Error (HTTP ${status}): ${message}`;
    }
  }

  if (error instanceof AppError) {
    return error.message;
  }

  if (error instanceof Error) {
    return sanitizeSecrets(error.message);
  }

  return sanitizeSecrets(String(error));
}

export function sanitizeSecrets(text: string): string {
  if (!text) return text;
  // Replace anything that looks like a token or secret
  let sanitized = text;
  // This is a basic regex to catch common token formats
  const tokenRegex =
    /(ya29\.[a-zA-Z0-9_-]+|1\/\/[a-zA-Z0-9_-]+|[a-zA-Z0-9_-]{40,})/g;
  sanitized = sanitized.replace(tokenRegex, "[REDACTED SECRET]");
  return sanitized;
}
