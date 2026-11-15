import type { Express } from 'express';
import request from 'supertest';

import { createApp } from '../../../src/app.js';
import { parseEnv } from '../../../src/config/env.js';
import { buildContainer, type Container } from '../../../src/container.js';
import { type FakeTcgdex, startFakeTcgdex } from './fakeTcgdex.js';

export interface TestApp {
  app: Express;
  container: Container;
  tcgdex: FakeTcgdex;
  close(): Promise<void>;
}

export interface TestUser {
  id: string;
  username: string;
  email: string;
  password: string;
  token: string;
}

export async function startTestApp(overrides: NodeJS.ProcessEnv = {}): Promise<TestApp> {
  const tcgdex = await startFakeTcgdex();
  const env = parseEnv({ ...process.env, TCGDEX_BASE_URL: tcgdex.url, ...overrides });
  const container = buildContainer(env);
  const app = createApp(container);

  return {
    app,
    container,
    tcgdex,
    async close() {
      await container.shutdown();
      await tcgdex.close();
    },
  };
}

let sequence = 0;

export function uniqueName(prefix = 'u'): string {
  sequence += 1;
  return `${prefix}${Date.now().toString(36)}${sequence}`.slice(0, 20);
}

export async function registerUser(app: Express, prefix = 'u'): Promise<TestUser> {
  const username = uniqueName(prefix);
  const email = `${username}@teste.dev`;
  const password = 'senha-de-teste-123';

  const res = await request(app).post('/auth/register').send({ username, name: `Teste ${username}`, email, password });
  if (res.status !== 201) {
    throw new Error(`cadastro de ${username} falhou: ${res.status} ${JSON.stringify(res.body)}`);
  }

  return { id: res.body.data.user.id, username, email, password, token: res.body.data.token };
}

export async function loginSeedUser(app: Express, username: 'admin' | 'ash' | 'misty'): Promise<string> {
  const password = username === 'admin' ? process.env.SEED_ADMIN_PASSWORD : process.env.SEED_DEMO_PASSWORD;
  const res = await request(app).post('/auth/login').send({ email: `${username}@pokebox.dev`, password });
  if (res.status !== 200) {
    throw new Error(`login de ${username} falhou: ${res.status} ${JSON.stringify(res.body)}`);
  }

  return res.body.data.token;
}
