import type { Prisma, TradeStatus } from '../generated/prisma/index.js';
import type { Db } from '../lib/prisma.js';
import type { NewTradeItem } from '../utils/tradeRules.js';

const party = { select: { username: true, name: true } } as const;

export const tradeInclude = {
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
} satisfies Prisma.TradeInclude;

export type TradeWithItems = Prisma.TradeGetPayload<{ include: typeof tradeInclude }>;

export interface LockedTrade {
  id: string;
  status: TradeStatus;
  proposerId: string;
  recipientId: string;
}

export interface NewTrade {
  proposerId: string;
  recipientId: string;
  offerId: string;
  items: NewTradeItem[];
}

export interface TradeRepository {
  create(data: NewTrade, db?: Db): Promise<TradeWithItems>;
  findById(id: string, db?: Db): Promise<TradeWithItems | null>;
  findByOfferId(offerId: string, db?: Db): Promise<{ id: string } | null>;
  lockById(id: string, db?: Db): Promise<LockedTrade | null>;
  findSent(userId: string, status?: TradeStatus): Promise<TradeWithItems[]>;
  findReceived(userId: string, status?: TradeStatus): Promise<TradeWithItems[]>;
  updateStatus(id: string, status: TradeStatus, db?: Db): Promise<TradeWithItems>;
}
