import { AppError } from './AppError.js';

export class NotFoundError extends AppError {
  constructor(message: string, details?: unknown) {
    super(404, message, details);
    this.name = 'NotFoundError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string, details?: unknown) {
    super(403, message, details);
    this.name = 'ForbiddenError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: unknown) {
    super(409, message, details);
    this.name = 'ConflictError';
  }
}

export class UnprocessableError extends AppError {
  constructor(message: string, details?: unknown) {
    super(422, message, details);
    this.name = 'UnprocessableError';
  }
}
