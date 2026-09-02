import winston from 'winston';
import { sanitizeSecrets } from './error_handling';

const { combine, timestamp, printf, errors } = winston.format;

// Custom format to sanitize output
const sanitizeFormat = winston.format((info) => {
  if (info.message && typeof info.message === 'string') {
    info.message = sanitizeSecrets(info.message);
  }
  // Sanitize stack traces if any
  if (info.stack && typeof info.stack === 'string') {
    info.stack = sanitizeSecrets(info.stack);
  }
  return info;
});

const customFormat = printf(({ level, message, timestamp, stack }) => {
  return `${timestamp} ${level}: ${stack || message}`;
});

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    errors({ stack: true }),
    timestamp(),
    sanitizeFormat(),
    customFormat
  ),
  transports: [
    new winston.transports.Console()
  ]
});
