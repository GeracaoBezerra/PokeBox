import { spawn } from 'node:child_process';

import { loadDatabaseEnv } from '../src/config/env.js';
import { createPrismaClient } from '../src/lib/prisma.js';
import { seedIfEmpty } from '../src/lib/seedIfEmpty.js';

const env = loadDatabaseEnv();
const prisma = createPrismaClient(env.DATABASE_URL);

function runSeed(): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn('npm', ['run', 'db:seed'], { stdio: 'inherit' });
    child.on('error', reject);
    child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`o seed terminou com código ${code}`))));
  });
}

seedIfEmpty({ countUsers: () => prisma.user.count(), runSeed, log: (message) => console.log(message) })
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
