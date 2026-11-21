import type { PrismaClient } from '../../../src/generated/prisma/index.js';

export interface ItemState {
  userId: string;
  cardId: string;
  condition: string;
  finish: string;
  firstEdition: boolean;
  quantity: number;
  reservedQuantity: number;
}

export interface InvariantProblem {
  collectionItemId: string;
  problem: string;
}

export async function collectionsOf(db: PrismaClient, userIds: string[]): Promise<ItemState[]> {
  return db.collectionItem.findMany({
    where: { userId: { in: userIds } },
    select: {
      userId: true,
      cardId: true,
      condition: true,
      finish: true,
      firstEdition: true,
      quantity: true,
      reservedQuantity: true,
    },
    orderBy: [{ userId: 'asc' }, { cardId: 'asc' }, { condition: 'asc' }, { finish: 'asc' }, { firstEdition: 'asc' }],
  });
}

export async function cardTotals(db: PrismaClient, cardIds: string[]): Promise<Record<string, number>> {
  const groups = await db.collectionItem.groupBy({
    by: ['cardId'],
    where: { cardId: { in: cardIds } },
    _sum: { quantity: true },
  });

  return Object.fromEntries(cardIds.map((cardId) => [cardId, groups.find((g) => g.cardId === cardId)?._sum.quantity ?? 0]));
}

export async function invariantProblems(db: PrismaClient, userIds: string[]): Promise<InvariantProblem[]> {
  const items = await db.collectionItem.findMany({
    where: { userId: { in: userIds } },
    select: {
      id: true,
      quantity: true,
      reservedQuantity: true,
      listings: { where: { status: { in: ['ACTIVE', 'PAUSED', 'IN_TRADE'] } }, select: { quantity: true } },
      tradeItems: { where: { trade: { status: 'PROPOSED' } }, select: { quantity: true } },
    },
  });

  return items.flatMap((item) => {
    const problems: InvariantProblem[] = [];
    const reserved = item.tradeItems.reduce((sum, tradeItem) => sum + tradeItem.quantity, 0);
    const listed = item.listings.reduce((sum, listing) => sum + listing.quantity, 0);

    if (item.reservedQuantity !== reserved) {
      problems.push({ collectionItemId: item.id, problem: `reservado ${item.reservedQuantity}, trocas abertas ${reserved}` });
    }
    if (listed + item.reservedQuantity > item.quantity) {
      problems.push({
        collectionItemId: item.id,
        problem: `anunciado ${listed} + reservado ${item.reservedQuantity} > quantidade ${item.quantity}`,
      });
    }
    return problems;
  });
}

export function quantityOf(items: ItemState[], userId: string, cardId: string): number {
  return items.filter((item) => item.userId === userId && item.cardId === cardId).reduce((sum, item) => sum + item.quantity, 0);
}
