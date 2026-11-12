import type { ErrorTranslator, TranslatedError } from '../ErrorTranslator.js';

const CHECK_VIOLATION = '23514';

const KNOWN_CODES: Record<string, TranslatedError> = {
  P2002: { statusCode: 409, message: 'Registro duplicado' },
  P2003: { statusCode: 409, message: 'Registro em uso por outro recurso' },
  P2025: { statusCode: 404, message: 'Registro não encontrado' },
};

interface PrismaKnownRequestErrorLike {
  name: 'PrismaClientKnownRequestError';
  code?: string;
  meta?: { driverAdapterError?: { cause?: { originalCode?: string } } };
}

function isPrismaKnownRequestError(err: unknown): err is PrismaKnownRequestErrorLike {
  return typeof err === 'object' && err !== null && 'name' in err && err.name === 'PrismaClientKnownRequestError';
}

export class PrismaErrorTranslator implements ErrorTranslator {
  translate(err: unknown): TranslatedError | null {
    if (!isPrismaKnownRequestError(err)) return null;

    const known = err.code ? KNOWN_CODES[err.code] : undefined;
    if (known) return { ...known };

    const postgresCode = err.meta?.driverAdapterError?.cause?.originalCode;
    if (postgresCode === CHECK_VIOLATION) {
      return { statusCode: 422, message: 'Valor viola uma regra do banco' };
    }

    return null;
  }
}
