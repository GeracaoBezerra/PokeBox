import type { CorsOptions } from 'cors';

import type { Env } from './env.js';

export type CorsEnv = Pick<Env, 'CORS_ORIGIN' | 'CORS_ORIGIN_REGEX'>;

export function isAllowedOrigin(origin: string, env: CorsEnv): boolean {
  if (env.CORS_ORIGIN.includes(origin)) return true;
  return env.CORS_ORIGIN_REGEX !== undefined && new RegExp(env.CORS_ORIGIN_REGEX).test(origin);
}

export function buildCorsOptions(env: CorsEnv): CorsOptions {
  return {
    origin: (origin, callback) => callback(null, origin === undefined || isAllowedOrigin(origin, env)),
  };
}
