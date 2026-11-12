import { prisma, type Db } from '../lib/prisma.js';
import type {
  CollectionItemKey,
  CollectionItemWithCard,
  LockedCollectionItem,
  NewCollectionItem,
} from './CollectionRepository.js';
import { PrismaCollectionRepository } from './PrismaCollectionRepository.js';

const legacyCollection = new PrismaCollectionRepository(prisma);

export function lockById(id: string, tx: Db): Promise<LockedCollectionItem | null> {
  return legacyCollection.lockById(id, tx);
}

export function addOrIncrement(data: NewCollectionItem, db?: Db): Promise<CollectionItemWithCard> {
  return legacyCollection.addOrIncrement(data, db);
}

export function findIdsByKeys(keys: CollectionItemKey[]): Promise<string[]> {
  return legacyCollection.findIdsByKeys(keys);
}

export function reserve(id: string, quantity: number, tx: Db): Promise<void> {
  return legacyCollection.reserve(id, quantity, tx);
}

export function release(id: string, quantity: number, tx: Db): Promise<void> {
  return legacyCollection.release(id, quantity, tx);
}

export function transferOut(id: string, quantity: number, tx: Db): Promise<void> {
  return legacyCollection.transferOut(id, quantity, tx);
}
