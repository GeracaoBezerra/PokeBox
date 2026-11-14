import { loadEnv } from '../config/env.js';
import type { CollectionItem, PrismaClient, Trade, User } from '../generated/prisma/index.js';
import { createPrismaClient } from '../lib/prisma.js';
import { PrismaCollectionRepository } from '../repositories/PrismaCollectionRepository.js';
import { PrismaOfferRepository } from '../repositories/PrismaOfferRepository.js';
import { PrismaTradeRepository } from '../repositories/PrismaTradeRepository.js';
import { PrismaTransactionRunner } from '../repositories/PrismaTransactionRunner.js';
import { buildPrismaTradeUnitOfWork, PrismaUnitOfWorkFactory } from '../repositories/PrismaUnitOfWorkFactory.js';
import { TradeService } from './TradeService.js';

const describeDb = process.env.RUN_DB_TESTS ? describe : describe.skip;

describeDb('accept com banco (RN-07): falha no meio desfaz tudo', () => {
  const suffix = String(Date.now()).slice(-8);
  let prisma: PrismaClient | undefined;
  let service: TradeService;
  let owner: User;
  let proposer: User;
  let trade: Trade;

  const db = (): PrismaClient => {
    if (!prisma) throw new Error('Prisma não iniciado');
    return prisma;
  };

  beforeAll(async () => {
    prisma = createPrismaClient(loadEnv().DATABASE_URL);

    let calls = 0;
    const unitOfWork = new PrismaUnitOfWorkFactory(new PrismaTransactionRunner(prisma), (tx) => {
      const uow = buildPrismaTradeUnitOfWork(tx);
      const real = uow.collection;
      return {
        ...uow,
        collection: {
          reserve: (id, quantity) => real.reserve(id, quantity),
          release: (id, quantity) => real.release(id, quantity),
          addOrIncrement: (data) => real.addOrIncrement(data),
          transferOut: async (id, quantity) => {
            calls += 1;
            if (calls === 2) throw new Error('falha forçada');
            return real.transferOut(id, quantity);
          },
        },
      };
    });

    service = new TradeService({
      offers: new PrismaOfferRepository(prisma),
      trades: new PrismaTradeRepository(prisma),
      collection: new PrismaCollectionRepository(prisma),
      unitOfWork,
    });

    const user = (role: string) =>
      db().user.create({
        data: {
          username: `rb_${role}_${suffix}`,
          name: `Rollback ${role}`,
          email: `rb_${role}_${suffix}@pokebox.test`,
          passwordHash: 'x',
        },
      });
    owner = await user('owner');
    proposer = await user('prop');

    const item = (userId: string, cardId: string) =>
      db().collectionItem.create({
        data: { userId, cardId, finish: 'HOLO', quantity: 2, reservedQuantity: 1 },
      });
    const ownerItem = await item(owner.id, 'base1-4');
    const proposerItem = await item(proposer.id, 'sv03.5-151');

    const tradeItem = (collectionItem: CollectionItem, fromUserId: string, toUserId: string) => ({
      collectionItemId: collectionItem.id,
      cardId: collectionItem.cardId,
      condition: collectionItem.condition,
      finish: collectionItem.finish,
      firstEdition: collectionItem.firstEdition,
      quantity: 1,
      fromUserId,
      toUserId,
    });
    trade = await db().trade.create({
      data: {
        proposerId: proposer.id,
        recipientId: owner.id,
        items: {
          create: [tradeItem(ownerItem, owner.id, proposer.id), tradeItem(proposerItem, proposer.id, owner.id)],
        },
      },
    });
  });

  afterAll(async () => {
    if (!prisma) return;
    const userIds = [owner?.id, proposer?.id].filter((id): id is string => Boolean(id));
    await prisma.trade.deleteMany({ where: { proposerId: { in: userIds } } });
    await prisma.collectionItem.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.$disconnect();
  });

  it('quantidades, reservas e status ficam como antes', async () => {
    const snapshot = () =>
      Promise.all([
        db().collectionItem.findMany({
          where: { userId: { in: [owner.id, proposer.id] } },
          select: { id: true, userId: true, cardId: true, quantity: true, reservedQuantity: true },
          orderBy: { id: 'asc' },
        }),
        db().trade.findUnique({ where: { id: trade.id }, select: { status: true, completedAt: true } }),
      ]);

    const before = await snapshot();

    await expect(service.accept(owner.id, trade.id)).rejects.toThrow('falha forçada');

    const after = await snapshot();
    expect(after).toEqual(before);
    expect(after[0]).toHaveLength(2);
    expect(after[1]).toEqual({ status: 'PROPOSED', completedAt: null });
  });
});
