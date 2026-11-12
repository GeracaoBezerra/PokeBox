import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient, type Prisma } from '../generated/prisma/index.js';

export type Db = PrismaClient | Prisma.TransactionClient;

export function createPrismaClient(databaseUrl: string): PrismaClient {
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });
}

export const prisma = createPrismaClient(process.env.DATABASE_URL ?? '');
