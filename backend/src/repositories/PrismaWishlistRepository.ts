import { ConflictError } from '../errors/domainErrors.js';
import type { Db } from '../lib/prisma.js';
import { isUniqueViolation } from './prismaErrors.js';
import {
  wishlistItemWithCard,
  type NewWishlistItem,
  type WishlistItem,
  type WishlistItemWithCard,
  type WishlistRepository,
} from './WishlistRepository.js';

export class PrismaWishlistRepository implements WishlistRepository {
  constructor(private readonly db: Db) {}

  findManyByUser(userId: string): Promise<WishlistItemWithCard[]> {
    return this.db.wishlistItem.findMany({
      where: { userId },
      include: wishlistItemWithCard,
      orderBy: [{ card: { name: 'asc' } }, { createdAt: 'asc' }],
    });
  }

  findById(id: string): Promise<WishlistItem | null> {
    return this.db.wishlistItem.findUnique({ where: { id } });
  }

  async create({ userId, cardId }: NewWishlistItem): Promise<WishlistItemWithCard> {
    try {
      return await this.db.wishlistItem.create({
        data: { userId, cardId },
        include: wishlistItemWithCard,
      });
    } catch (err) {
      if (isUniqueViolation(err)) throw new ConflictError('Esta carta já está na sua wishlist');
      throw err;
    }
  }

  async remove(id: string): Promise<void> {
    await this.db.wishlistItem.delete({ where: { id }, select: { id: true } });
  }

  existsByUserAndCard(userId: string, cardId: string): Promise<{ id: string } | null> {
    return this.db.wishlistItem.findUnique({
      where: { userId_cardId: { userId, cardId } },
      select: { id: true },
    });
  }

  async removeByUserAndCard(userId: string, cardId: string, db: Db = this.db): Promise<boolean> {
    const { count } = await db.wishlistItem.deleteMany({ where: { userId, cardId } });
    return count > 0;
  }
}
