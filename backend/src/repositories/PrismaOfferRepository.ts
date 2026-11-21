import { Prisma, type OfferCancelReason, type OfferStatus } from '../generated/prisma/index.js';
import type { Db } from '../lib/prisma.js';
import { NotFoundError } from '../errors/domainErrors.js';
import type { OfferCounts } from '../utils/collectionRules.js';
import {
  offerInclude,
  type LockedOffer,
  type NewOffer,
  type OfferListOptions,
  type OfferRepository,
  type OfferWithDetails,
} from './OfferRepository.js';

const newestFirst = [{ createdAt: 'desc' }, { id: 'asc' }] as const;

export class PrismaOfferRepository implements OfferRepository {
  constructor(private readonly db: Db) {}

  async create({ items, ...data }: NewOffer, db: Db = this.db): Promise<OfferWithDetails> {
    const copies = await db.collectionItem.findMany({
      where: { id: { in: items.map((item) => item.collectionItemId) } },
      select: { id: true, cardId: true, condition: true, finish: true, firstEdition: true },
    });
    const byId = new Map(copies.map(({ id, ...copy }) => [id, copy]));

    return db.offer.create({
      data: {
        ...data,
        items: {
          create: items.map(({ collectionItemId, quantity }) => {
            const copy = byId.get(collectionItemId);
            if (!copy) throw new NotFoundError('Item da coleção não encontrado');
            return { collectionItemId, quantity, ...copy };
          }),
        },
      },
      include: offerInclude,
    });
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

  findSent(userId: string, { status, skip, take }: OfferListOptions = {}): Promise<OfferWithDetails[]> {
    return this.db.offer.findMany({
      where: { proposerId: userId, status },
      include: offerInclude,
      orderBy: [...newestFirst],
      skip,
      take,
    });
  }

  async findReceived(userId: string, { status, skip = 0, take }: OfferListOptions = {}): Promise<OfferWithDetails[]> {
    if (status) {
      return this.db.offer.findMany({
        where: { status, listing: { collectionItem: { userId } } },
        include: offerInclude,
        orderBy: [...newestFirst],
        skip,
        take,
      });
    }

    const limit = take === undefined ? Prisma.empty : Prisma.sql`LIMIT ${take}`;
    const ranked = await this.db.$queryRaw<{ id: string }[]>`
      SELECT o."id"
      FROM "Offer" o
      JOIN "Listing" l ON l."id" = o."listingId"
      JOIN "CollectionItem" ci ON ci."id" = l."collectionItemId"
      WHERE ci."userId" = ${userId}
      ORDER BY
        CASE
          WHEN o."status" = 'PROPOSED' AND l."status" <> 'IN_TRADE' AND o."quantity" <= l."quantity" THEN 0
          WHEN o."status" = 'PROPOSED' THEN 1
          ELSE 2
        END,
        o."createdAt" DESC,
        o."id" ASC
      OFFSET ${skip}
      ${limit}
    `;

    const ids = ranked.map((row) => row.id);
    const rows = await this.db.offer.findMany({ where: { id: { in: ids } }, include: offerInclude });
    const byId = new Map(rows.map((row) => [row.id, row]));
    return ids.flatMap((id) => byId.get(id) ?? []);
  }

  async countByItem(collectionItemId: string, db: Db = this.db): Promise<OfferCounts> {
    const open = await db.offerItem.count({ where: { collectionItemId, offer: { status: 'PROPOSED' } } });
    const accepted = await db.offerItem.count({ where: { collectionItemId, offer: { status: 'ACCEPTED', trade: null } } });

    return { open, accepted };
  }

  updateStatus(
    id: string,
    status: OfferStatus,
    db: Db = this.db,
    cancelReason: OfferCancelReason | null = null,
  ): Promise<OfferWithDetails> {
    return db.offer.update({
      where: { id },
      data: { status, cancelReason, respondedAt: new Date() },
      include: offerInclude,
    });
  }

  async cancelByIds(ids: string[], reason: OfferCancelReason, db: Db = this.db): Promise<number> {
    if (ids.length === 0) return 0;

    await db.offer.updateMany({
      where: { id: { in: ids } },
      data: { status: 'CANCELED', cancelReason: reason, respondedAt: new Date() },
    });

    return ids.length;
  }

  async cancelOpenByListing(listingId: string, reason: OfferCancelReason, db: Db = this.db): Promise<number> {
    const open = await db.$queryRaw<{ id: string }[]>`
      SELECT "id"
      FROM "Offer"
      WHERE "listingId" = ${listingId} AND "status" = 'PROPOSED'
      ORDER BY "id"
      FOR UPDATE
    `;

    return this.cancelByIds(
      open.map((offer) => offer.id),
      reason,
      db,
    );
  }

  async cancelOpenOfUser(userId: string, reason: OfferCancelReason, db: Db = this.db): Promise<number> {
    const open = await db.$queryRaw<{ id: string }[]>`
      SELECT o."id"
      FROM "Offer" o
      JOIN "Listing" l ON l."id" = o."listingId"
      JOIN "CollectionItem" ci ON ci."id" = l."collectionItemId"
      WHERE o."status" = 'PROPOSED' AND (o."proposerId" = ${userId} OR ci."userId" = ${userId})
      ORDER BY o."id"
      FOR UPDATE OF o
    `;

    return this.cancelByIds(
      open.map((offer) => offer.id),
      reason,
      db,
    );
  }
}
