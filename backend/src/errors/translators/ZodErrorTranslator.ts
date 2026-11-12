import { ZodError } from 'zod';

import type { ErrorTranslator, TranslatedError } from '../ErrorTranslator.js';

export class ZodErrorTranslator implements ErrorTranslator {
  translate(err: unknown): TranslatedError | null {
    if (!(err instanceof ZodError)) return null;

    return {
      statusCode: 400,
      message: 'Dados inválidos',
      details: err.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      })),
    };
  }
}
