import type { Db } from '../lib/prisma.js';
import { USABLE_STATUSES } from '../utils/accountStatus.js';
import { itemOrderBy } from '../utils/itemSort.js';
import { cardWhere } from '../utils/listingSearch.js';
import type { PageWindow } from '../utils/pagination.js';
import {
  collectionItemWithCard,
  collectionItemWithUsage,
  listedItemWhere,
  type CardOwner,
  type CollectionFilters,
  type CollectionItemChanges,
  type CollectionItemKey,
  type CollectionItemWithCard,
  type CollectionItemWithUsage,
  type CollectionRepository,
  type CollectionSummary,
  type LockedCollectionItem,
  type NewCollectionItem,
  type PublicCollectionFilters,
} from './CollectionRepository.js';

export class PrismaCollectionRepository implements CollectionRepository {
  constructor(private readonly db: Db) {}

  findManyByUser(
    userId: string,
    { q, setId, type, condition, finish, isPublic, withZero, sort, skip, take }: CollectionFilters & Partial<PageWindow> = {},
  ): Promise<CollectionItemWithUsage[]> {
    return this.db.collectionItem.findMany({
      where: {
        userId,
        condition,
        finish,
        isPublic,
        quantity: withZero === false ? { gt: 0 } : undefined,
        card: cardWhere({ q, setId, type }),
      },
      include: collectionItemWithUsage,
      orderBy: itemOrderBy(sort),
      skip,
      take,
    });
  }

  async summarizeByUser(userId: string): Promise<CollectionSummary> {
    const [units, cards, listedItems] = await Promise.all([
      this.db.collectionItem.aggregate({ where: { userId }, _sum: { quantity: true } }),
      this.db.collectionItem.groupBy({ by: ['cardId'], where: { userId, quantity: { gt: 0 } } }),
      this.db.collectionItem.count({ where: { userId, ...listedItemWhere } }),
    ]);

    return { totalUnits: units._sum.quantity ?? 0, distinctCards: cards.length, listedItems };
  }

  findPublicByUser(
    userId: string,
    { q, type, skip, take }: PublicCollectionFilters & Partial<PageWindow> = {},
  ): Promise<CollectionItemWithCard[]> {
    return this.db.collectionItem.findMany({
      where: { userId, isPublic: true, quantity: { gt: 0 }, card: cardWhere({ q, type }) },
      include: collectionItemWithCard,
      orderBy: itemOrderBy(),
      skip,
      take,
    });
  }

  findById(id: string): Promise<CollectionItemWithCard | null> {
    return this.db.collectionItem.findUnique({ where: { id }, include: collectionItemWithCard });
  }

  addOrIncrement(
    { userId, cardId, condition, finish, firstEdition, quantity, isPublic }: NewCollectionItem,
    db: Db = this.db,
  ): Promise<CollectionItemWithCard> {
    return db.collectionItem.upsert({
      where: {
        userId_cardId_condition_finish_firstEdition: {
          userId,
          cardId,
          condition: condition ?? 'NEAR_MINT',
          finish,
          firstEdition,
        },
      },
      create: { userId, cardId, condition, finish, firstEdition, quantity, isPublic },
      update: { quantity: { increment: quantity } },
      include: collectionItemWithCard,
    });
  }

  async findIdsByKeys(keys: CollectionItemKey[]): Promise<string[]> {
    if (keys.length === 0) return [];

    const items = await this.db.collectionItem.findMany({
      where: { OR: keys },
      select: { id: true },
    });

    return items.map((item) => item.id);
  }

  async lockById(id: string, db: Db = this.db): Promise<LockedCollectionItem | null> {
    const rows = await db.$queryRaw<LockedCollectionItem[]>`
      SELECT "id", "userId", "cardId", "quantity", "reservedQuantity", "condition"
      FROM "CollectionItem"
      WHERE "id" = ${id}
      FOR UPDATE
    `;

    return rows[0] ?? null;
  }

  async lockInOrder(ids: string[], db: Db = this.db): Promise<Map<string, LockedCollectionItem | null>> {
    const locked = new Map<string, LockedCollectionItem | null>();
    for (const id of [...new Set(ids)].sort()) {
      locked.set(id, await this.lockById(id, db));
    }
    return locked;
  }

  update(id: string, data: CollectionItemChanges, db: Db = this.db): Promise<CollectionItemWithCard> {
    return db.collectionItem.update({ where: { id }, data, include: collectionItemWithCard });
  }

  async reserve(id: string, quantity: number, db: Db = this.db): Promise<void> {
    await db.collectionItem.update({
      where: { id },
      data: { reservedQuantity: { increment: quantity } },
      select: { id: true },
    });
  }

  async release(id: string, quantity: number, db: Db = this.db): Promise<void> {
    await db.collectionItem.update({
      where: { id },
      data: { reservedQuantity: { decrement: quantity } },
      select: { id: true },
    });
  }

  async transferOut(id: string, quantity: number, db: Db = this.db): Promise<void> {
    await db.collectionItem.update({
      where: { id },
      data: { quantity: { decrement: quantity }, reservedQuantity: { decrement: quantity } },
      select: { id: true },
    });
  }

  async remove(id: string): Promise<void> {
    await this.db.collectionItem.delete({ where: { id }, select: { id: true } });
  }

  async findOwnersOfCards(cardIds: string[], userId: string): Promise<CardOwner[]> {
    const owners = await this.db.collectionItem.groupBy({
      by: ['cardId', 'userId'],
      where: {
        cardId: { in: cardIds },
        userId: { not: userId },
        isPublic: true,
        quantity: { gt: this.db.collectionItem.fields.reservedQuantity },
        user: { deletedAt: null, accountStatus: { in: USABLE_STATUSES } },
      },
    });

    return owners.map(({ cardId, userId: ownerId }) => ({ cardId, userId: ownerId }));
  }

  async sumQuantityByUserAndCard(userId: string, cardId: string): Promise<number | null> {
    const result = await this.db.collectionItem.aggregate({
      where: { userId, cardId },
      _sum: { quantity: true },
    });
    return result._sum.quantity;
  }
}
