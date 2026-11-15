import type { Request, RequestHandler } from 'express';
import { ipKeyGenerator, rateLimit } from 'express-rate-limit';

export const AUTH_LIMIT_WINDOW_MS = 15 * 60 * 1000;

export const TOO_MANY_ATTEMPTS = 'Muitas tentativas sem sucesso. Tente de novo em alguns minutos.';

const passThrough: RequestHandler = (_req, _res, next) => next();

export function attemptKey(req: Pick<Request, 'ip' | 'body'>): string {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  return `${ipKeyGenerator(req.ip ?? '')}|${email}`;
}

export function createAuthLimiter(limit: number, windowMs = AUTH_LIMIT_WINDOW_MS): RequestHandler {
  if (limit === 0) return passThrough;

  return rateLimit({
    windowMs,
    limit,
    skipSuccessfulRequests: true,
    keyGenerator: attemptKey,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { success: false, error: TOO_MANY_ATTEMPTS },
  });
}
