export interface TcgdexUnavailableOptions {
  timeout?: boolean;
  cause?: unknown;
}

export class TcgdexUnavailableError extends Error {
  readonly timeout: boolean;

  constructor(message: string, { timeout = false, cause }: TcgdexUnavailableOptions = {}) {
    super(message, { cause });
    this.name = 'TcgdexUnavailableError';
    this.timeout = timeout;
  }
}
