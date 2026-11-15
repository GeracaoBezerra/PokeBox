import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';

import { jest } from '@jest/globals';

import { createApp } from './app.js';
import { parseEnv } from './config/env.js';
import type { Container } from './container.js';
import type { PrismaClient } from './generated/prisma/index.js';
import { createLogger } from './lib/logger.js';
import type { AuthMiddleware } from './middlewares/AuthMiddleware.js';
import { createErrorHandler } from './middlewares/errorHandler.js';
import { createRequestLogger } from './middlewares/requestLogger.js';

const env = parseEnv({
  NODE_ENV: 'test',
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/pokebox',
  JWT_SECRET: 'um-segredo-bem-comprido',
  RENDER_GIT_COMMIT: 'abc123',
});

const queryRaw = jest.fn<() => Promise<unknown>>();

function buildFakeContainer(): Container {
  const logger = createLogger(env);
  return {
    infra: {
      env,
      prisma: { $queryRaw: queryRaw } as unknown as PrismaClient,
      auth: {} as AuthMiddleware,
      logger,
    },
    requestLogger: createRequestLogger(logger),
    errorHandler: createErrorHandler([], logger),
    modules: [],
    shutdown: async () => {},
  };
}

let server: Server;
let baseUrl: string;

beforeAll(async () => {
  server = createApp(buildFakeContainer()).listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
});

beforeEach(() => queryRaw.mockReset());

describe('createApp', () => {
  it('/health responde 200 com o commit, sem tocar no banco', async () => {
    const res = await fetch(`${baseUrl}/health`);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, data: { status: 'ok', version: 'abc123' } });
    expect(queryRaw).not.toHaveBeenCalled();
  });

  it('/health/ready responde 200 quando o banco responde', async () => {
    queryRaw.mockResolvedValue([{ '?column?': 1 }]);

    const res = await fetch(`${baseUrl}/health/ready`);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, data: { status: 'ok', database: 'ok', version: 'abc123' } });
  });

  it('/health/ready responde 503 quando o banco não responde', async () => {
    queryRaw.mockRejectedValue(new Error('connection refused'));

    const res = await fetch(`${baseUrl}/health/ready`);

    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ success: false, error: 'Banco de dados indisponível' });
  });

  it('toda resposta leva o x-request-id, reaproveitando o que veio', async () => {
    const gerado = await fetch(`${baseUrl}/nada`);
    const repassado = await fetch(`${baseUrl}/nada`, { headers: { 'x-request-id': 'teste-123' } });

    expect(gerado.headers.get('x-request-id')).toMatch(/^[0-9a-f-]{36}$/);
    expect(repassado.headers.get('x-request-id')).toBe('teste-123');
  });
});
