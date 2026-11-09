import { prisma } from '../lib/prisma.js';
import * as collectionRepository from './collectionRepository.js';

export function withTransaction(fn) {
  return prisma.$transaction(fn);
}

export async function lockInOrder(ids, tx) {
  const locked = new Map();
  for (const id of [...new Set(ids)].sort()) {
    locked.set(id, await collectionRepository.lockById(id, tx));
  }
  return locked;
}
