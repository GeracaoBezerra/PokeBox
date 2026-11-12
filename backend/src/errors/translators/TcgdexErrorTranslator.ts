import type { Logger } from '../../lib/logger.js';
import type { ErrorTranslator, TranslatedError } from '../ErrorTranslator.js';
import { TcgdexUnavailableError } from '../TcgdexUnavailableError.js';

export class TcgdexErrorTranslator implements ErrorTranslator {
  constructor(private readonly logger: Logger = console) {}

  translate(err: unknown): TranslatedError | null {
    if (!(err instanceof TcgdexUnavailableError)) return null;

    this.logger.error('[TCGdex indisponível]', err.message);

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
}
