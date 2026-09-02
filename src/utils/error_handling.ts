export class AppError extends Error {
  public statusCode?: number;
  public isTransient: boolean;

  constructor(message: string, statusCode?: number, isTransient: boolean = false) {
    super(message);
    this.statusCode = statusCode;
    this.isTransient = isTransient;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export function standardizeError(error: any): string {
  // Check if it's an API Error from googleapis
  if (error && error.response && error.response.status) {
    const status = error.response.status;
    const message = error.response.data?.error?.message || error.message;

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

  if (error instanceof AppError) {
    return error.message;
  }

  // Fallback for unknown errors (sanitize by returning generic message if needed)
  // For safety in production, we avoid returning full stack traces or internal secrets.
  const genericMessage = error?.message || 'An unknown error occurred';
  return sanitizeSecrets(genericMessage);
}

export function sanitizeSecrets(text: string): string {
  if (!text) return text;
  // Replace anything that looks like a token or secret
  let sanitized = text;
  // This is a basic regex to catch common token formats
  const tokenRegex = /(ya29\.[a-zA-Z0-9_-]+|1\/\/[a-zA-Z0-9_-]+|[a-zA-Z0-9_-]{40,})/g;
  sanitized = sanitized.replace(tokenRegex, '[REDACTED SECRET]');
  return sanitized;
}
