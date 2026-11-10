import { ZodError } from 'zod';

import { AppError } from '../utils/AppError.js';
import { translatePrismaError } from '../utils/prismaError.js';
import { translateTcgdexError } from '../utils/tcgdexError.js';

export function notFoundHandler(req, res) {
  return res.status(404).json({
    success: false,
    error: `Rota não encontrada: ${req.method} ${req.originalUrl}`,
  });
}

export function errorHandler(err, req, res, next) {
  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, error: 'JSON inválido' });
  }

  if (err instanceof ZodError) {
    const details = err.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));

    return res.status(400).json({
      success: false,
      error: 'Dados inválidos',
      details,
    });
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ success: false, error: err.message });
  }

  const prismaError = translatePrismaError(err);
  if (prismaError) {
    return res.status(prismaError.statusCode).json({ success: false, error: prismaError.message });
  }

  const tcgdexError = translateTcgdexError(err);
  if (tcgdexError) {
    console.error('[TCGdex indisponível]', err.message);
    return res.status(tcgdexError.statusCode).json({ success: false, error: tcgdexError.message });
  }

  console.error('[erro inesperado]', err);

  return res.status(500).json({ success: false, error: 'Erro interno do servidor' });
}
