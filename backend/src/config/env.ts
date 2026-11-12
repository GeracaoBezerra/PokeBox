import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import dotenv from 'dotenv';
import { z } from 'zod';

const envFile = fileURLToPath(new URL('../../../.env', import.meta.url));

if (existsSync(envFile)) {
  dotenv.config({ path: envFile });
}

const emptyAsUndefined = (value: unknown) => (value === '' ? undefined : value);

const port = z.coerce.number().int().positive();

const tokenLifetime = /^\d*\.?\d+ *(ms|msecs?|milliseconds?|s|secs?|seconds?|m|mins?|minutes?|h|hrs?|hours?|d|days?|w|weeks?|y|yrs?|years?)?$/i;

export const envSchema = z.object({
  NODE_ENV: z.preprocess(emptyAsUndefined, z.enum(['development', 'test', 'production']).default('development')),
  PORT: z.preprocess(emptyAsUndefined, port.default(3000)),
  BACKEND_PORT: z.preprocess(emptyAsUndefined, port.optional()),
  DATABASE_URL: z.url({ message: 'precisa ser uma URL de conexão válida' }),
  JWT_SECRET: z.string().min(16, 'precisa ter pelo menos 16 caracteres'),
  JWT_EXPIRES_IN: z.preprocess(
    emptyAsUndefined,
    z.string().regex(tokenLifetime, 'use um prazo como 1d, 12h ou 30m').default('1d'),
  ),
  TCGDEX_BASE_URL: z.preprocess(emptyAsUndefined, z.url().default('https://api.tcgdex.net/v2')),
  USE_MOCK: z.preprocess(emptyAsUndefined, z.stringbool().default(false)),
});

export type Env = z.infer<typeof envSchema>;

const databaseEnvSchema = envSchema.pick({ DATABASE_URL: true });

export type DatabaseEnv = z.infer<typeof databaseEnvSchema>;

export class EnvValidationError extends Error {
  readonly problems: string[];

  constructor(problems: string[]) {
    super(`Variáveis de ambiente inválidas:\n${problems.map((problem) => `  - ${problem}`).join('\n')}`);
    this.name = 'EnvValidationError';
    this.problems = problems;
  }
}

function parseWith<S extends z.ZodType>(schema: S, source: NodeJS.ProcessEnv): z.infer<S> {
  const result = schema.safeParse(source);

  if (!result.success) {
    const problems = result.error.issues.map((issue) => {
      const name = issue.path.join('.');
      const value = source[name];
      const message = value === undefined || value === '' ? 'variável obrigatória ausente' : issue.message;
      return `${name}: ${message}`;
    });
    throw new EnvValidationError(problems);
  }

  return result.data;
}

function exitIfInvalid<T>(parse: () => T): T {
  try {
    return parse();
  } catch (error) {
    if (!(error instanceof EnvValidationError)) throw error;
    console.error(error.message);
    process.exit(1);
  }
}

export function parseEnv(source: NodeJS.ProcessEnv): Env {
  return parseWith(envSchema, source);
}

export function parseDatabaseEnv(source: NodeJS.ProcessEnv): DatabaseEnv {
  return parseWith(databaseEnvSchema, source);
}

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  return exitIfInvalid(() => parseEnv(source));
}

export function loadDatabaseEnv(source: NodeJS.ProcessEnv = process.env): DatabaseEnv {
  return exitIfInvalid(() => parseDatabaseEnv(source));
}
