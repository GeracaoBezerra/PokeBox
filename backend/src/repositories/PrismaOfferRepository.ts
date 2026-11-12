import type { OfferStatus } from '../generated/prisma/index.js';
import type { Db } from '../lib/prisma.js';
import type { OfferCounts } from '../utils/collectionRules.js';
import {
  offerInclude,
  type AcceptedOffer,
  type LockedOffer,
  type NewOffer,
  type OfferRepository,
  type OfferWithDetails,
} from './OfferRepository.js';

const newestFirst = [{ createdAt: 'desc' }, { id: 'asc' }] as const;

export class PrismaOfferRepository implements OfferRepository {
  constructor(private readonly db: Db) {}

  create({ items, ...data }: NewOffer, db: Db = this.db): Promise<OfferWithDetails> {
    return db.offer.create({ data: { ...data, items: { create: items } }, include: offerInclude });
  }

  findById(id: string, db: Db = this.db): Promise<OfferWithDetails | null> {
    return db.offer.findUnique({ where: { id }, include: offerInclude });
  }

  async lockById(id: string, db: Db = this.db): Promise<LockedOffer | null> {
    const rows = await db.$queryRaw<LockedOffer[]>`
      SELECT "id", "status", "listingId", "proposerId"
      FROM "Offer"
      WHERE "id" = ${id}
      FOR UPDATE
    `;

    return rows[0] ?? null;
  }

  findOpenByProposerAndListing(proposerId: string, listingId: string, db: Db = this.db): Promise<{ id: string } | null> {
    return db.offer.findFirst({
      where: { proposerId, listingId, status: 'PROPOSED' },
      select: { id: true },
    });
  }

  findSent(userId: string, status?: OfferStatus): Promise<OfferWithDetails[]> {
    return this.db.offer.findMany({
      where: { proposerId: userId, status },
      include: offerInclude,
      orderBy: [...newestFirst],
    });
  }

  findReceived(userId: string, status?: OfferStatus): Promise<OfferWithDetails[]> {
    return this.db.offer.findMany({
      where: { listing: { collectionItem: { userId } }, status },
      include: offerInclude,
      orderBy: [...newestFirst],
    });
  }

  async countByItem(collectionItemId: string, db: Db = this.db): Promise<OfferCounts> {
    const open = await db.offerItem.count({ where: { collectionItemId, offer: { status: 'PROPOSED' } } });
    const accepted = await db.offerItem.count({ where: { collectionItemId, offer: { status: 'ACCEPTED' } } });

    return { open, accepted };
  }

  updateStatus(id: string, status: OfferStatus, db: Db = this.db): Promise<OfferWithDetails> {
    return db.offer.update({
      where: { id },
      data: { status, respondedAt: new Date() },
      include: offerInclude,
    });
  }

  async deleteItems(offerId: string, db: Db = this.db): Promise<void> {
    await db.offerItem.deleteMany({ where: { offerId } });
  }

  async cancelByIds(ids: string[], db: Db = this.db): Promise<number> {
    if (ids.length === 0) return 0;

    await db.offerItem.deleteMany({ where: { offerId: { in: ids } } });
    await db.offer.updateMany({
      where: { id: { in: ids } },
      data: { status: 'CANCELED', respondedAt: new Date() },
    });

    return ids.length;
  }

  async cancelOpenByListing(listingId: string, db: Db = this.db): Promise<number> {
    const open = await db.$queryRaw<{ id: string }[]>`
      SELECT "id"
      FROM "Offer"
      WHERE "listingId" = ${listingId} AND "status" = 'PROPOSED'
      ORDER BY "id"
      FOR UPDATE
    `;

    return this.cancelByIds(
      open.map((offer) => offer.id),
      db,
    );
  }

  lockAcceptedWithoutTrade(listingId: string, db: Db = this.db): Promise<AcceptedOffer[]> {
    return db.$queryRaw<AcceptedOffer[]>`
      SELECT o."id", o."quantity"
      FROM "Offer" o
      WHERE o."listingId" = ${listingId}
        AND o."status" = 'ACCEPTED'
        AND NOT EXISTS (SELECT 1 FROM "Trade" t WHERE t."offerId" = o."id")
      ORDER BY o."id"
      FOR UPDATE
    `;
  }
}
