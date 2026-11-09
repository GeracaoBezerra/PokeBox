import { jest } from '@jest/globals';

const describeDb = process.env.RUN_DB_TESTS ? describe : describe.skip;

describeDb('accept com banco (RN-07): falha no meio desfaz tudo', () => {
  const suffix = String(Date.now()).slice(-8);
  let prisma;
  let accept;
  let owner;
  let proposer;
  let ownerItem;
  let proposerItem;
  let trade;

  beforeAll(async () => {
    await import('../config/env.js');
    const actual = await import('../repositories/collectionRepository.js');

    let calls = 0;
    jest.unstable_mockModule('../repositories/collectionRepository.js', () => ({
      ...actual,
      transferOut: async (...args) => {
        calls += 1;
        if (calls === 2) throw new Error('falha forçada');
        return actual.transferOut(...args);
      },
    }));

    ({ prisma } = await import('../lib/prisma.js'));
    ({ accept } = await import('./trade.service.js'));

    const user = (role) =>
      prisma.user.create({
        data: {
          username: `rb_${role}_${suffix}`,
          name: `Rollback ${role}`,
          email: `rb_${role}_${suffix}@pokebox.test`,
          passwordHash: 'x',
        },
      });
    owner = await user('owner');
    proposer = await user('prop');

    const item = (userId, cardId) =>
      prisma.collectionItem.create({
        data: { userId, cardId, finish: 'HOLO', quantity: 2, reservedQuantity: 1 },
      });
    ownerItem = await item(owner.id, 'base1-4');
    proposerItem = await item(proposer.id, 'sv03.5-151');

    const tradeItem = (collectionItem, fromUserId, toUserId) => ({
      collectionItemId: collectionItem.id,
      cardId: collectionItem.cardId,
      condition: collectionItem.condition,
      finish: collectionItem.finish,
      firstEdition: collectionItem.firstEdition,
      quantity: 1,
      fromUserId,
      toUserId,
    });
    trade = await prisma.trade.create({
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
    const userIds = [owner?.id, proposer?.id].filter(Boolean);
    await prisma.trade.deleteMany({ where: { proposerId: { in: userIds } } });
    await prisma.collectionItem.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.$disconnect();
  });

  it('quantidades, reservas e status ficam como antes', async () => {
    const snapshot = () =>
      Promise.all([
        prisma.collectionItem.findMany({
          where: { userId: { in: [owner.id, proposer.id] } },
          select: { id: true, userId: true, cardId: true, quantity: true, reservedQuantity: true },
          orderBy: { id: 'asc' },
        }),
        prisma.trade.findUnique({ where: { id: trade.id }, select: { status: true, completedAt: true } }),
      ]);

    const before = await snapshot();

    await expect(accept(owner.id, trade.id)).rejects.toThrow('falha forçada');

    const after = await snapshot();
    expect(after).toEqual(before);
    expect(after[0]).toHaveLength(2);
    expect(after[1]).toEqual({ status: 'PROPOSED', completedAt: null });
  });
});
