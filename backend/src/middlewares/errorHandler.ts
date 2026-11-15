import type { ErrorRequestHandler, Request, Response } from 'express';

import type { ErrorTranslator } from '../errors/ErrorTranslator.js';
import type { Logger } from '../lib/logger.js';

export function notFoundHandler(req: Request, res: Response) {
  return res.status(404).json({
    success: false,
    error: `Rota não encontrada: ${req.method} ${req.originalUrl}`,
  });
}

export function createErrorHandler(translators: ErrorTranslator[], logger: Logger = console): ErrorRequestHandler {
  return (err, req, res, _next) => {
    for (const translator of translators) {
      const translated = translator.translate(err);
      if (!translated) continue;

      const { statusCode, message, details } = translated;
      if (details === undefined) {
        return res.status(statusCode).json({ success: false, error: message });
      }
      return res.status(statusCode).json({ success: false, error: message, details });
    }

    (req.log ?? logger).error({ err }, 'erro inesperado');

    return res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  };
}
