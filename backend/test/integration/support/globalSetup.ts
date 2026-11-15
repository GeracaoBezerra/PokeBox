import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import dotenv from 'dotenv';
import pg from 'pg';

const backendDir = fileURLToPath(new URL('../../..', import.meta.url));
const envTestFile = fileURLToPath(new URL('../../../.env.test', import.meta.url));

export function loadTestEnv(): void {
  if (existsSync(envTestFile)) {
    dotenv.config({ path: envTestFile, quiet: true });
  }

  process.env.NODE_ENV = 'test';
  process.env.PRISMA_DATABASE_URL ??= process.env.DATABASE_URL;
}

export function assertTestDatabase(url: string | undefined): string {
  if (!url) {
    throw new Error('DATABASE_URL ausente: crie backend/.env.test a partir de backend/.env.test.example');
  }

  const database = new URL(url).pathname.replace(/^\//, '');
  if (!database.endsWith('_test')) {
    throw new Error(
      `Os testes de integração apagam o banco "${database}". Use um banco com nome terminado em _test (ver backend/.env.test.example).`,
    );
  }

  return url;
}

async function recreateSchema(url: string): Promise<void> {
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    await client.query('DROP SCHEMA IF EXISTS public CASCADE');
    await client.query('CREATE SCHEMA public');
  } finally {
    await client.end();
  }
}

function run(command: string): void {
  execSync(command, { cwd: backendDir, env: process.env, stdio: ['ignore', 'ignore', 'inherit'] });
}

export default async function globalSetup(): Promise<void> {
  loadTestEnv();
  const url = assertTestDatabase(process.env.DATABASE_URL);
  assertTestDatabase(process.env.PRISMA_DATABASE_URL);

  await recreateSchema(url);
  run('npx prisma migrate deploy');
  run('npx prisma db seed');
}
