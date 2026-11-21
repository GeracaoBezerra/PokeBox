import { loadEnv } from '../../src/config/env.js';
import type { CollectionItem, Listing, Offer, PrismaClient, Trade, User } from '../../src/generated/prisma/index.js';
import { createPrismaClient } from '../../src/lib/prisma.js';
import { PrismaCollectionRepository } from '../../src/repositories/PrismaCollectionRepository.js';
import { PrismaListingRepository } from '../../src/repositories/PrismaListingRepository.js';
import { PrismaOfferRepository } from '../../src/repositories/PrismaOfferRepository.js';
import { PrismaTradeRepository } from '../../src/repositories/PrismaTradeRepository.js';
import { PrismaTransactionRunner } from '../../src/repositories/PrismaTransactionRunner.js';
import { buildPrismaTradeUnitOfWork, PrismaUnitOfWorkFactory } from '../../src/repositories/PrismaUnitOfWorkFactory.js';
import { OfferService } from '../../src/services/OfferService.js';
import { TradeOpener } from '../../src/services/TradeOpener.js';
import { TradeService } from '../../src/services/TradeService.js';
import { cardTotals, collectionsOf, invariantProblems } from './support/integrity.js';

const CARDS = ['base1-4', 'sv03.5-151'];

describe('falha forçada no meio: nada muda (RN-07, RN-08)', () => {
  const suffix = String(Date.now()).slice(-8);
  let prisma: PrismaClient | undefined;
  let owner: User;
  let proposer: User;
  let ownerItem: CollectionItem;
  let proposerItem: CollectionItem;

  const db = (): PrismaClient => {
    if (!prisma) throw new Error('Prisma não iniciado');
    return prisma;
  };

  const userIds = () => [owner.id, proposer.id];

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

  beforeAll(async () => {
    prisma = createPrismaClient(loadEnv().DATABASE_URL);

    const user = (role: string) =>
      db().user.create({
        data: {
          username: `rb_${role}_${suffix}`,
          name: `Rollback ${role}`,
          email: `rb_${role}_${suffix}@pokebox.test`,
          passwordHash: 'x',
          accountStatus: 'ACTIVE',
        },
      });
    owner = await user('owner');
    proposer = await user('prop');

    const item = (userId: string, cardId: string, reservedQuantity: number) =>
      db().collectionItem.create({ data: { userId, cardId, finish: 'HOLO', quantity: 2, reservedQuantity } });
    ownerItem = await item(owner.id, CARDS[0], 1);
    proposerItem = await item(proposer.id, CARDS[1], 1);
  });

  afterAll(async () => {
    if (!prisma) return;
    const ids = [owner?.id, proposer?.id].filter((id): id is string => Boolean(id));
    await prisma.trade.deleteMany({ where: { proposerId: { in: ids } } });
    await prisma.offer.deleteMany({ where: { proposerId: { in: ids } } });
    await prisma.listing.deleteMany({ where: { collectionItem: { userId: { in: ids } } } });
    await prisma.collectionItem.deleteMany({ where: { userId: { in: ids } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    await prisma.$disconnect();
  });

  describe('na segunda confirmação (conclusão)', () => {
    let service: TradeService;
    let trade: Trade;

    beforeAll(async () => {
      let calls = 0;
      const unitOfWork = new PrismaUnitOfWorkFactory(new PrismaTransactionRunner(db()), (tx) => {
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
        offers: new PrismaOfferRepository(db()),
        trades: new PrismaTradeRepository(db()),
        collection: new PrismaCollectionRepository(db()),
        unitOfWork,
        opener: new TradeOpener(),
      });

      trade = await db().trade.create({
        data: {
          proposerId: proposer.id,
          recipientId: owner.id,
          proposerConfirmedAt: new Date(),
          items: {
            create: [tradeItem(ownerItem, owner.id, proposer.id), tradeItem(proposerItem, proposer.id, owner.id)],
          },
        },
      });
    });

    it('quantidades, reservas, confirmações e status ficam como antes; o total de cada carta não muda', async () => {
      const snapshot = () =>
        Promise.all([
          collectionsOf(db(), userIds()),
          cardTotals(db(), CARDS),
          db().trade.findUnique({
            where: { id: trade.id },
            select: { status: true, completedAt: true, proposerConfirmedAt: true, recipientConfirmedAt: true },
          }),
        ]);

      const before = await snapshot();

      await expect(service.accept(owner.id, trade.id)).rejects.toThrow('falha forçada');

      const after = await snapshot();
      expect(after).toEqual(before);
      expect(after[0]).toHaveLength(2);
      expect(after[2]).toMatchObject({ status: 'PROPOSED', completedAt: null, recipientConfirmedAt: null });
      expect(await invariantProblems(db(), userIds())).toEqual([]);
    });
  });

  describe('no aceite da oferta (a troca nasce)', () => {
    let service: OfferService;
    let listing: Listing;
    let offer: Offer;
    let freeOwnerItem: CollectionItem;
    let freeProposerItem: CollectionItem;

    beforeAll(async () => {
      const unitOfWork = new PrismaUnitOfWorkFactory(new PrismaTransactionRunner(db()), (tx) => {
        const uow = buildPrismaTradeUnitOfWork(tx);
        return {
          ...uow,
          trades: {
            create: (data) => uow.trades.create(data),
            findByOfferId: (id) => uow.trades.findByOfferId(id),
            lockById: (id) => uow.trades.lockById(id),
            updateStatus: (id, status) => uow.trades.updateStatus(id, status),
            confirm: (id, role, completes) => uow.trades.confirm(id, role, completes),
            findHolds: (id) => uow.trades.findHolds(id),
            countOpenHolds: (id) => uow.trades.countOpenHolds(id),
            hasOpenFor: (id) => uow.trades.hasOpenFor(id),
            addHolds: async () => {
              throw new Error('falha forçada no aceite');
            },
          },
        };
      });

      service = new OfferService({
        listings: new PrismaListingRepository(db()),
        offers: new PrismaOfferRepository(db()),
        unitOfWork,
        opener: new TradeOpener(),
      });

      freeOwnerItem = await db().collectionItem.create({
        data: { userId: owner.id, cardId: CARDS[0], finish: 'NORMAL', quantity: 1 },
      });
      freeProposerItem = await db().collectionItem.create({
        data: { userId: proposer.id, cardId: CARDS[1], finish: 'NORMAL', quantity: 1 },
      });
      listing = await db().listing.create({ data: { collectionItemId: freeOwnerItem.id, quantity: 1 } });
      offer = await db().offer.create({
        data: {
          listingId: listing.id,
          proposerId: proposer.id,
          quantity: 1,
          items: { create: [{ collectionItemId: freeProposerItem.id, cardId: CARDS[1], condition: 'NEAR_MINT', finish: 'NORMAL', quantity: 1 }] },
        },
      });
    });

    it('oferta continua aberta, sem troca; coleções e anúncio ficam como antes', async () => {
      const snapshot = () =>
        Promise.all([
          collectionsOf(db(), userIds()),
          cardTotals(db(), CARDS),
          db().offer.findUnique({ where: { id: offer.id }, include: { items: true, trade: true } }),
          db().listing.findUnique({ where: { id: listing.id }, select: { status: true, quantity: true } }),
        ]);

      const before = await snapshot();

      await expect(service.changeStatus(owner.id, offer.id, 'ACCEPTED')).rejects.toThrow('falha forçada no aceite');

      const after = await snapshot();
      expect(after).toEqual(before);
      expect(after[2]).toMatchObject({ status: 'PROPOSED', trade: null });
      expect(after[3]).toEqual({ status: 'ACTIVE', quantity: 1 });
      expect(await invariantProblems(db(), userIds())).toEqual([]);
    });
  });
});
