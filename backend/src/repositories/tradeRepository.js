import { prisma } from '../lib/prisma.js';

const party = { select: { username: true, name: true } };

const tradeInclude = {
  proposer: party,
  recipient: party,
  items: {
    include: {
      card: true,
      fromUser: { select: { username: true } },
      toUser: { select: { username: true } },
    },
    orderBy: { id: 'asc' },
  },
};

const newestFirst = [{ createdAt: 'desc' }, { id: 'asc' }];

export function create(data, tx) {
  return tx.trade.create({ data, include: tradeInclude });
}

export function findById(id, db = prisma) {
  return db.trade.findUnique({ where: { id }, include: tradeInclude });
}

export function findByOfferId(offerId, db = prisma) {
  return db.trade.findUnique({ where: { offerId }, select: { id: true } });
}

export async function lockById(id, tx) {
  const rows = await tx.$queryRaw`
    SELECT "id", "status", "proposerId", "recipientId"
    FROM "Trade"
    WHERE "id" = ${id}
    FOR UPDATE
  `;

  return rows[0] ?? null;
}

export function findSent(userId, status) {
  return prisma.trade.findMany({
    where: { proposerId: userId, status },
    include: tradeInclude,
    orderBy: newestFirst,
  });
}

export function findReceived(userId, status) {
  return prisma.trade.findMany({
    where: { recipientId: userId, status },
    include: tradeInclude,
    orderBy: newestFirst,
  });
}

export function updateStatus(id, status, tx) {
  return tx.trade.update({
    where: { id },
    data: { status, completedAt: status === 'ACCEPTED' ? new Date() : null },
    include: tradeInclude,
  });
}
