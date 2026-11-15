import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';

import type { RequestHandler } from 'express';
import type { Logger as PinoLogger } from 'pino';
import { pinoHttp } from 'pino-http';

export const REQUEST_ID_HEADER = 'x-request-id';

const MAX_REQUEST_ID_LENGTH = 128;

const HEALTH_ROUTE = /^\/health(\/ready)?(\?|$)/;

export function isQuietRequest(method: string | undefined, url: string | undefined): boolean {
  return method === 'OPTIONS' || HEALTH_ROUTE.test(url ?? '');
}

export function resolveRequestId(header: string | string[] | undefined): string {
  const value = Array.isArray(header) ? header[0] : header;
  if (value && value.length <= MAX_REQUEST_ID_LENGTH && /^[\w.:-]+$/.test(value)) return value;
  return randomUUID();
}

type LoggedRequest = IncomingMessage & { id?: unknown; originalUrl?: string };

export function pathOf(req: LoggedRequest): string | undefined {
  return req.originalUrl ?? req.url;
}

export function levelFor(statusCode: number, err?: Error): 'info' | 'warn' | 'error' {
  if (err || statusCode >= 500) return 'error';
  if (statusCode >= 400) return 'warn';
  return 'info';
}

export function createRequestLogger(logger: PinoLogger): RequestHandler {
  return pinoHttp({
    logger,
    genReqId: (req: IncomingMessage, res: ServerResponse) => {
      const id = resolveRequestId(req.headers[REQUEST_ID_HEADER]);
      res.setHeader(REQUEST_ID_HEADER, id);
      return id;
    },
    autoLogging: { ignore: (req) => isQuietRequest(req.method, req.url) },
    customLogLevel: (_req, res, err) => levelFor(res.statusCode, err),
    customSuccessMessage: (req, res) => `${req.method} ${pathOf(req)} ${res.statusCode}`,
    customErrorMessage: (req, res) => `${req.method} ${pathOf(req)} ${res.statusCode}`,
    serializers: {
      req: (req: { id: unknown; method: string; url: string; raw?: LoggedRequest }) => ({
        id: req.id,
        method: req.method,
        url: req.raw ? pathOf(req.raw) : req.url,
      }),
      res: (res: { statusCode: number }) => ({ statusCode: res.statusCode }),
    },
  }) as RequestHandler;
}
