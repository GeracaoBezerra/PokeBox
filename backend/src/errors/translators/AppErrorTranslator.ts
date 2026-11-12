import { AppError } from '../AppError.js';
import type { ErrorTranslator, TranslatedError } from '../ErrorTranslator.js';

export class AppErrorTranslator implements ErrorTranslator {
  translate(err: unknown): TranslatedError | null {
    if (!(err instanceof AppError)) return null;

    const translated: TranslatedError = { statusCode: err.statusCode, message: err.message };
    if (err.details !== undefined) translated.details = err.details;
    return translated;
  }
}
