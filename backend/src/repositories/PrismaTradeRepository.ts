import type { TradeStatus } from '../generated/prisma/index.js';
import type { Db } from '../lib/prisma.js';
import { pendingFirst } from '../utils/pendingFirst.js';
import type { ListingHold, TradeRole } from '../utils/tradeRules.js';
import {
  tradeInclude,
  type LockedTrade,
  type NewTrade,
  type TradeListOptions,
  type TradeRepository,
  type TradeWithItems,
} from './TradeRepository.js';

const newestFirst = [{ createdAt: 'desc' }, { id: 'asc' }] as const;

export class PrismaTradeRepository implements TradeRepository {
  constructor(private readonly db: Db) {}

  create({ items, ...data }: NewTrade, db: Db = this.db): Promise<TradeWithItems> {
    return db.trade.create({ data: { ...data, items: { create: items } }, include: tradeInclude });
  }

  findById(id: string, db: Db = this.db): Promise<TradeWithItems | null> {
    return db.trade.findUnique({ where: { id }, include: tradeInclude });
  }

  findByOfferId(offerId: string, db: Db = this.db): Promise<{ id: string } | null> {
    return db.trade.findUnique({ where: { offerId }, select: { id: true } });
  }

  async lockById(id: string, db: Db = this.db): Promise<LockedTrade | null> {
    const rows = await db.$queryRaw<LockedTrade[]>`
      SELECT "id", "status", "proposerId", "recipientId", "proposerConfirmedAt", "recipientConfirmedAt"
      FROM "Trade"
      WHERE "id" = ${id}
      FOR UPDATE
    `;

    return rows[0] ?? null;
  }

  findSent(userId: string, { status, skip, take }: TradeListOptions = {}): Promise<TradeWithItems[]> {
    return this.db.trade.findMany({
      where: { proposerId: userId, status },
      include: tradeInclude,
      orderBy: [...newestFirst],
      skip,
      take,
    });
  }

  findReceived(userId: string, { status, skip, take }: TradeListOptions = {}): Promise<TradeWithItems[]> {
    const where = { recipientId: userId };
    if (status) {
      return this.db.trade.findMany({ where: { ...where, status }, include: tradeInclude, orderBy: [...newestFirst], skip, take });
    }

    return pendingFirst(
      {
        find: (pending, window) =>
          this.db.trade.findMany({
            where: { ...where, status: pending ? 'PROPOSED' : { not: 'PROPOSED' } },
            include: tradeInclude,
            orderBy: [...newestFirst],
            ...window,
          }),
        countPending: () => this.db.trade.count({ where: { ...where, status: 'PROPOSED' } }),
      },
      { skip, take },
    );
  }

  updateStatus(id: string, status: TradeStatus, db: Db = this.db): Promise<TradeWithItems> {
    return db.trade.update({
      where: { id },
      data: { status, completedAt: status === 'ACCEPTED' ? new Date() : null },
      include: tradeInclude,
    });
  }

  confirm(id: string, role: TradeRole, completes: boolean, db: Db = this.db): Promise<TradeWithItems> {
    const now = new Date();
    const confirmation = role === 'recipient' ? { recipientConfirmedAt: now } : { proposerConfirmedAt: now };

    return db.trade.update({
      where: { id },
      data: { ...confirmation, ...(completes ? { status: 'ACCEPTED', completedAt: now } : {}) },
      include: tradeInclude,
    });
  }

  async addHolds(tradeId: string, holds: ListingHold[], db: Db = this.db): Promise<void> {
    if (holds.length === 0) return;
    await db.tradeListingHold.createMany({ data: holds.map((hold) => ({ tradeId, ...hold })) });
  }

  findHolds(tradeId: string, db: Db = this.db): Promise<ListingHold[]> {
    return db.tradeListingHold.findMany({
      where: { tradeId },
      select: { listingId: true, quantity: true },
      orderBy: { listingId: 'asc' },
    });
  }

  countOpenHolds(listingId: string, db: Db = this.db): Promise<number> {
    return db.tradeListingHold.count({ where: { listingId, trade: { status: 'PROPOSED' } } });
  }

  async hasOpenFor(userId: string, db: Db = this.db): Promise<boolean> {
    const open = await db.trade.findFirst({
      where: { status: 'PROPOSED', OR: [{ proposerId: userId }, { recipientId: userId }] },
      select: { id: true },
    });
    return open !== null;
  }
}
