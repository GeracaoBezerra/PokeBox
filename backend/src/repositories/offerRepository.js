import { prisma } from '../lib/prisma.js';
import { listingInclude } from './listingRepository.js';

const offerInclude = {
  proposer: { select: { username: true, name: true } },
  listing: { include: listingInclude },
  items: {
    include: { collectionItem: { include: { card: true } } },
    orderBy: { id: 'asc' },
  },
};

const newestFirst = [{ createdAt: 'desc' }, { id: 'asc' }];

export function create(data, tx) {
  return tx.offer.create({ data, include: offerInclude });
}

export function findById(id, db = prisma) {
  return db.offer.findUnique({ where: { id }, include: offerInclude });
}

export async function lockById(id, tx) {
  const rows = await tx.$queryRaw`
    SELECT "id", "status", "listingId", "proposerId"
    FROM "Offer"
    WHERE "id" = ${id}
    FOR UPDATE
  `;

  return rows[0] ?? null;
}

export function findOpenByProposerAndListing(proposerId, listingId, db = prisma) {
  return db.offer.findFirst({
    where: { proposerId, listingId, status: 'PROPOSED' },
    select: { id: true },
  });
}

export function findSent(userId, status) {
  return prisma.offer.findMany({
    where: { proposerId: userId, status },
    include: offerInclude,
    orderBy: newestFirst,
  });
}

export function findReceived(userId, status) {
  return prisma.offer.findMany({
    where: { listing: { collectionItem: { userId } }, status },
    include: offerInclude,
    orderBy: newestFirst,
  });
}

export function updateStatus(id, status, tx) {
  return tx.offer.update({
    where: { id },
    data: { status, respondedAt: new Date() },
    include: offerInclude,
  });
}

export function deleteItems(offerId, tx) {
  return tx.offerItem.deleteMany({ where: { offerId } });
}

export async function cancelOpenByListing(listingId, tx) {
  const open = await tx.$queryRaw`
    SELECT "id"
    FROM "Offer"
    WHERE "listingId" = ${listingId} AND "status" = 'PROPOSED'
    ORDER BY "id"
    FOR UPDATE
  `;
  const ids = open.map((offer) => offer.id);
  if (ids.length === 0) return 0;

  await tx.offerItem.deleteMany({ where: { offerId: { in: ids } } });
  await tx.offer.updateMany({
    where: { id: { in: ids } },
    data: { status: 'CANCELED', respondedAt: new Date() },
  });

  return ids.length;
}
