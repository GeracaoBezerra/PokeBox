import type { Db } from '../lib/prisma.js';
import { USABLE_STATUSES } from '../utils/accountStatus.js';
import {
  collectionItemWithCard,
  type CardOwner,
  type CollectionItemChanges,
  type CollectionItemKey,
  type CollectionItemWithCard,
  type CollectionRepository,
  type LockedCollectionItem,
  type NewCollectionItem,
} from './CollectionRepository.js';

const byCardName = [{ card: { name: 'asc' } }, { createdAt: 'asc' }] as const;

export class PrismaCollectionRepository implements CollectionRepository {
  constructor(private readonly db: Db) {}

  findManyByUser(userId: string): Promise<CollectionItemWithCard[]> {
    return this.db.collectionItem.findMany({
      where: { userId },
      include: collectionItemWithCard,
      orderBy: [...byCardName],
    });
  }

  findPublicByUser(userId: string): Promise<CollectionItemWithCard[]> {
    return this.db.collectionItem.findMany({
      where: { userId, isPublic: true, quantity: { gt: 0 } },
      include: collectionItemWithCard,
      orderBy: [...byCardName],
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
