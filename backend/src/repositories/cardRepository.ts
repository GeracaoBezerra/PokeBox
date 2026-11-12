import type { Card } from '../generated/prisma/index.js';
import { prisma } from '../lib/prisma.js';
import type { CardRecord } from '../utils/cardRecord.js';
import { PrismaCardRepository } from './PrismaCardRepository.js';

const legacyCards = new PrismaCardRepository(prisma);

export function upsertCard(record: CardRecord): Promise<Card> {
  return legacyCards.upsertCard(record);
}
