import { createRequire } from 'node:module';

import { pino, type DestinationStream, type Logger as PinoLogger } from 'pino';

import type { Env } from '../config/env.js';

type LogFn = (fields: object, message: string) => void;

export interface Logger {
  info: LogFn;
  warn: LogFn;
  error: LogFn;
}

export const REDACTED_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'res.headers["set-cookie"]',
  '*.password',
  '*.passwordHash',
  '*.token',
];

function hasPrettyPrinter(): boolean {
  try {
    createRequire(import.meta.url).resolve('pino-pretty');
    return true;
  } catch {
    return false;
  }
}

export function createLogger(env: Pick<Env, 'NODE_ENV' | 'LOG_LEVEL'>, destination?: DestinationStream): PinoLogger {
  const level = env.LOG_LEVEL ?? (env.NODE_ENV === 'test' ? 'silent' : 'info');
  const pretty = env.NODE_ENV === 'development' && hasPrettyPrinter();

  const options = { level, redact: { paths: REDACTED_PATHS, censor: '[oculto]' } };

  if (pretty && !destination) {
    return pino({
      ...options,
      transport: { target: 'pino-pretty', options: { translateTime: 'SYS:HH:MM:ss', ignore: 'pid,hostname' } },
    });
  }

  return destination ? pino(options, destination) : pino(options);
}
