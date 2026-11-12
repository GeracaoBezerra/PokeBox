import type { ErrorTranslator, TranslatedError } from '../ErrorTranslator.js';

const BODY_ERRORS: Record<string, TranslatedError> = {
  'entity.parse.failed': { statusCode: 400, message: 'JSON inválido' },
  'entity.too.large': { statusCode: 413, message: 'Corpo da requisição grande demais' },
};

export class BodyParserErrorTranslator implements ErrorTranslator {
  translate(err: unknown): TranslatedError | null {
    if (typeof err !== 'object' || err === null || !('type' in err) || typeof err.type !== 'string') return null;
    const translated = BODY_ERRORS[err.type];
    return translated ? { ...translated } : null;
  }
}
