import { prisma, type Db } from '../lib/prisma.js';
import type { LockedCollectionItem } from './CollectionRepository.js';
import { PrismaCollectionRepository } from './PrismaCollectionRepository.js';
import { PrismaTransactionRunner } from './PrismaTransactionRunner.js';

const legacyRunner = new PrismaTransactionRunner(prisma);
const legacyCollection = new PrismaCollectionRepository(prisma);

export function withTransaction<T>(work: (tx: Db) => Promise<T>): Promise<T> {
  return legacyRunner.run(work);
}

export function lockInOrder(ids: string[], tx: Db): Promise<Map<string, LockedCollectionItem | null>> {
  return legacyCollection.lockInOrder(ids, tx);
}
