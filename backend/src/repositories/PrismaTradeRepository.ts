import type { TradeStatus } from '../generated/prisma/index.js';
import type { Db } from '../lib/prisma.js';
import {
  tradeInclude,
  type LockedTrade,
  type NewTrade,
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
      SELECT "id", "status", "proposerId", "recipientId"
      FROM "Trade"
      WHERE "id" = ${id}
      FOR UPDATE
    `;

    return rows[0] ?? null;
  }

  findSent(userId: string, status?: TradeStatus): Promise<TradeWithItems[]> {
    return this.db.trade.findMany({
      where: { proposerId: userId, status },
      include: tradeInclude,
      orderBy: [...newestFirst],
    });
  }

  findReceived(userId: string, status?: TradeStatus): Promise<TradeWithItems[]> {
    return this.db.trade.findMany({
      where: { recipientId: userId, status },
      include: tradeInclude,
      orderBy: [...newestFirst],
    });
  }

  updateStatus(id: string, status: TradeStatus, db: Db = this.db): Promise<TradeWithItems> {
    return db.trade.update({
      where: { id },
      data: { status, completedAt: status === 'ACCEPTED' ? new Date() : null },
      include: tradeInclude,
    });
  }
}
