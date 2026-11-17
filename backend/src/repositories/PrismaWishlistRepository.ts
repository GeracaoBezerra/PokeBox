import { ConflictError } from '../errors/domainErrors.js';
import type { Db } from '../lib/prisma.js';
import { USABLE_STATUSES } from '../utils/accountStatus.js';
import { itemOrderBy } from '../utils/itemSort.js';
import { cardWhere } from '../utils/listingSearch.js';
import type { PageWindow } from '../utils/pagination.js';
import { isUniqueViolation } from './prismaErrors.js';
import {
  wishlistItemWithCard,
  type NewWishlistItem,
  type MostWishedCard,
  type WishlistFilters,
  type WishlistItem,
  type WishlistItemWithCard,
  type WishlistRepository,
} from './WishlistRepository.js';

export class PrismaWishlistRepository implements WishlistRepository {
  constructor(private readonly db: Db) {}

  async findMostWished(limit: number): Promise<MostWishedCard[]> {
    const groups = await this.db.wishlistItem.groupBy({
      by: ['cardId'],
      where: { user: { deletedAt: null, accountStatus: { in: USABLE_STATUSES } } },
      _count: { cardId: true },
      orderBy: [{ _count: { cardId: 'desc' } }, { cardId: 'asc' }],
      take: limit,
    });
    if (!groups.length) return [];
    const cards = await this.db.card.findMany({ where: { id: { in: groups.map((group) => group.cardId) } } });
    const byId = new Map(cards.map((card) => [card.id, card]));
    return groups.flatMap((group, index) => {
      const card = byId.get(group.cardId);
      return card ? [{ rank: index + 1, wishlistCount: group._count.cardId, card }] : [];
    });
  }

  findManyByUser(
    userId: string,
    { q, type, rarity, sort, skip, take }: WishlistFilters & Partial<PageWindow> = {},
  ): Promise<WishlistItemWithCard[]> {
    return this.db.wishlistItem.findMany({
      where: { userId, card: cardWhere({ q, type, rarity }) },
      include: wishlistItemWithCard,
      orderBy: itemOrderBy(sort),
      skip,
      take,
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
