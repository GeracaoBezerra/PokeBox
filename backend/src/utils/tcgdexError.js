export class TcgdexUnavailableError extends Error {
  constructor(message, { timeout = false, cause } = {}) {
    super(message, { cause });
    this.name = 'TcgdexUnavailableError';
    this.timeout = timeout;
  }
}

export function translateTcgdexError(err) {
  if (!(err instanceof TcgdexUnavailableError)) return null;

  if (err.timeout) {
    return {
      statusCode: 504,
      message: 'O serviço de cartas demorou para responder. Tente novamente em instantes',
    };
  }

  return {
    statusCode: 502,
    message: 'Serviço de cartas indisponível no momento. Tente novamente em instantes',
  };
}
