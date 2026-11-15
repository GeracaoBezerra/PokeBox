import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';

import { jest } from '@jest/globals';
import { Router } from 'express';

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
const lines: Record<string, unknown>[] = [];

function buildFakeContainer(): Container {
  const logger = createLogger(
    { NODE_ENV: 'production', LOG_LEVEL: 'info' },
    { write: (line: string) => lines.push(JSON.parse(line)) },
  );
  const boom = Router().get('/', () => {
    throw new Error('boom de verdade');
  });
  return {
    infra: {
      env,
      prisma: { $queryRaw: queryRaw } as unknown as PrismaClient,
      auth: {} as AuthMiddleware,
      logger,
    },
    requestLogger: createRequestLogger(logger),
    errorHandler: createErrorHandler([], logger),
    modules: [{ routes: [{ path: '/boom', router: boom }] }],
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

beforeEach(() => {
  queryRaw.mockReset();
  lines.length = 0;
});

const waitForLog = () => new Promise((resolve) => setTimeout(resolve, 20));

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

  it('erro 500 gera uma linha de log só, com o erro de verdade', async () => {
    const res = await fetch(`${baseUrl}/boom`, { headers: { 'x-request-id': 'req-500' } });
    await waitForLog();

    expect(res.status).toBe(500);
    const errors = lines.filter((line) => line.level === 50);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({
      req: { id: 'req-500', method: 'GET', url: '/boom' },
      res: { statusCode: 500 },
      err: { message: 'boom de verdade' },
    });
    expect(errors[0]).not.toHaveProperty('pid');
    expect(errors[0]).not.toHaveProperty('hostname');
  });

  it('/health, /health/ready e o preflight do CORS ficam fora do log; /healthz não', async () => {
    queryRaw.mockResolvedValue([]);
    await fetch(`${baseUrl}/health`);
    await fetch(`${baseUrl}/health/ready`);
    await fetch(`${baseUrl}/boom`, {
      method: 'OPTIONS',
      headers: { origin: 'http://localhost:5173', 'access-control-request-method': 'POST' },
    });
    await fetch(`${baseUrl}/healthz`);
    await waitForLog();

    expect(lines.map((line) => line.msg)).toEqual(['GET /healthz 404']);
  });

  it('o navegador consegue ler o x-request-id', async () => {
    const res = await fetch(`${baseUrl}/health`, { headers: { origin: 'http://localhost:5173' } });

    expect(res.headers.get('access-control-expose-headers')).toBe('x-request-id');
  });
});
