import { prisma } from '../lib/prisma.js';
import type { Db } from '../lib/prisma.js';
import { PrismaWishlistRepository } from './PrismaWishlistRepository.js';

const legacyWishlist = new PrismaWishlistRepository(prisma);

export function removeByUserAndCard(userId: string, cardId: string, db?: Db): Promise<boolean> {
  return legacyWishlist.removeByUserAndCard(userId, cardId, db);
}
