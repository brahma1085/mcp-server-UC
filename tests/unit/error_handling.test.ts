import { standardizeError, sanitizeSecrets, AppError } from '../../src/utils/error_handling';

describe('Error Handling Utilities', () => {
  describe('sanitizeSecrets', () => {
    it('should redact common token formats', () => {
      const input = 'Error with token ya29.a0AfB_byAe_xyz123 and another 1//0eabcxyz';
      const result = sanitizeSecrets(input);
      expect(result).not.toContain('ya29.a0AfB_byAe_xyz123');
      expect(result).not.toContain('1//0eabcxyz');
      expect(result).toContain('[REDACTED SECRET]');
    });

    it('should return original text if no secrets found', () => {
      const input = 'A simple error occurred.';
      expect(sanitizeSecrets(input)).toBe(input);
    });
  });

  describe('standardizeError', () => {
    it('should map HTTP 429 to a rate limit message', () => {
      const err = { response: { status: 429 } };
      const message = standardizeError(err);
      expect(message).toContain('Rate limit exceeded');
    });

    it('should map HTTP 403 to an auth error', () => {
      const err = { response: { status: 403 } };
      const message = standardizeError(err);
      expect(message).toContain('Authentication or permission error');
    });

    it('should map HTTP 404 to resource not found', () => {
      const err = { response: { status: 404 } };
      const message = standardizeError(err);
      expect(message).toContain('Resource not found');
    });

    it('should return AppError messages as is', () => {
      const err = new AppError('Custom app error', 400);
      expect(standardizeError(err)).toBe('Custom app error');
    });

    it('should sanitize raw error messages', () => {
      const err = new Error('Failed with token ya29.12345xyz');
      const message = standardizeError(err);
      expect(message).not.toContain('ya29.12345xyz');
      expect(message).toContain('[REDACTED SECRET]');
    });
  });
});
