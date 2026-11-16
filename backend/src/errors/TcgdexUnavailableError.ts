export interface TcgdexUnavailableOptions {
  timeout?: boolean;
  retryable?: boolean;
  cause?: unknown;
}

export class TcgdexUnavailableError extends Error {
  readonly timeout: boolean;
  readonly retryable: boolean;

  constructor(message: string, { timeout = false, retryable = false, cause }: TcgdexUnavailableOptions = {}) {
    super(message, { cause });
    this.name = 'TcgdexUnavailableError';
    this.timeout = timeout;
    this.retryable = retryable;
  }
}
