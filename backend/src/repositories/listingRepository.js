import { prisma } from '../lib/prisma.js';
import { USABLE_STATUSES } from '../utils/accountStatus.js';
import { OPEN_STATUSES } from '../utils/listingRules.js';

const listingInclude = {
  collectionItem: {
    include: {
      card: true,
      user: { select: { username: true, name: true, accountStatus: true, deletedAt: true } },
    },
  },
};

const newestFirst = [{ createdAt: 'desc' }, { id: 'asc' }];

export function findActive({ cardId, username, skip = 0, take }) {
  return prisma.listing.findMany({
    where: {
      status: 'ACTIVE',
      collectionItem: {
        cardId,
        user: { username, deletedAt: null, accountStatus: { in: USABLE_STATUSES } },
      },
    },
    include: listingInclude,
    orderBy: newestFirst,
    skip,
    take,
  });
}

export function findByOwner(userId) {
  return prisma.listing.findMany({
    where: { collectionItem: { userId } },
    include: listingInclude,
    orderBy: newestFirst,
  });
}

export function findById(id, db = prisma) {
  return db.listing.findUnique({ where: { id }, include: listingInclude });
}

export async function sumOpenByItem(collectionItemId, db = prisma, exceptId = undefined) {
  const result = await db.listing.aggregate({
    where: {
      collectionItemId,
      status: { in: OPEN_STATUSES },
      id: exceptId ? { not: exceptId } : undefined,
    },
    _sum: { quantity: true },
  });

  return result._sum.quantity ?? 0;
}

export async function countByItem(collectionItemId) {
  const groups = await prisma.listing.groupBy({
    by: ['status'],
    where: { collectionItemId },
    _count: { _all: true },
  });

  return groups.reduce(
    (counts, group) => ({
      open: counts.open + (OPEN_STATUSES.includes(group.status) ? group._count._all : 0),
      total: counts.total + group._count._all,
    }),
    { open: 0, total: 0 },
  );
}

export function create(data, db = prisma) {
  return db.listing.create({ data, include: listingInclude });
}

export function update(id, data, db = prisma) {
  return db.listing.update({ where: { id }, data, include: listingInclude });
}
