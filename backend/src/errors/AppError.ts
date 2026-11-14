export class AppError extends Error {
  readonly statusCode: number;
  readonly details?: unknown;
  readonly isOperational = true;

  constructor(statusCode: number, message: string, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.details = details;
  }
}
