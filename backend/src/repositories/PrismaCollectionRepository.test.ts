import { jest } from '@jest/globals';

import type { Db } from '../lib/prisma.js';
import type { LockedCollectionItem } from './CollectionRepository.js';
import { PrismaCollectionRepository } from './PrismaCollectionRepository.js';

const row = (id: string): LockedCollectionItem => ({
  id,
  userId: 'u',
  cardId: 'base1-4',
  quantity: 1,
  reservedQuantity: 0,
  condition: 'NEAR_MINT',
});

function fakeDb() {
  const collectionItem = {
    findMany: jest.fn<(args: unknown) => Promise<{ id: string }[]>>(async () => []),
    aggregate: jest.fn<(args: unknown) => Promise<{ _sum: { quantity: number | null } }>>(),
    groupBy: jest.fn<(args: unknown) => Promise<{ cardId: string }[]>>(async () => []),
    count: jest.fn<(args: unknown) => Promise<number>>(async () => 0),
  };
  const queryRaw = jest.fn<(strings: TemplateStringsArray, ...values: unknown[]) => Promise<LockedCollectionItem[]>>(
    async (_strings, id) => [row(String(id))],
  );
  return { collectionItem, queryRaw, db: { collectionItem, $queryRaw: queryRaw } as unknown as Db };
}

describe('PrismaCollectionRepository', () => {
  it('lockById devolve null quando a linha não existe', async () => {
    const { queryRaw, db } = fakeDb();
    queryRaw.mockResolvedValue([]);

    expect(await new PrismaCollectionRepository(db).lockById('x', db)).toBeNull();
  });

  it('lockInOrder trava cada id uma vez, em ordem, na transação recebida', async () => {
    const own = fakeDb();
    const tx = fakeDb();

    const locked = await new PrismaCollectionRepository(own.db).lockInOrder(['c', 'a', 'c', 'b'], tx.db);

    expect(tx.queryRaw.mock.calls.map(([, id]) => id)).toEqual(['a', 'b', 'c']);
    expect(own.queryRaw).not.toHaveBeenCalled();
    expect([...locked.keys()]).toEqual(['a', 'b', 'c']);
    expect(locked.get('b')).toEqual(row('b'));
  });

  it('findIdsByKeys sem chaves não consulta o banco', async () => {
    const { collectionItem, db } = fakeDb();

    expect(await new PrismaCollectionRepository(db).findIdsByKeys([])).toEqual([]);
    expect(collectionItem.findMany).not.toHaveBeenCalled();
  });

  it('sumQuantityByUserAndCard devolve a soma do banco', async () => {
    const { collectionItem, db } = fakeDb();
    collectionItem.aggregate.mockResolvedValue({ _sum: { quantity: 3 } });

    expect(await new PrismaCollectionRepository(db).sumQuantityByUserAndCard('u', 'base1-4')).toBe(3);
    expect(collectionItem.aggregate).toHaveBeenCalledWith({
      where: { userId: 'u', cardId: 'base1-4' },
      _sum: { quantity: true },
    });
  });

  it('findManyByUser com withZero=false traz só itens com quantidade', async () => {
    const { collectionItem, db } = fakeDb();

    await new PrismaCollectionRepository(db).findManyByUser('u', { withZero: false });
    await new PrismaCollectionRepository(db).findManyByUser('u');

    const [comFiltro, semFiltro] = collectionItem.findMany.mock.calls.map(([args]) => args as { where: object });
    expect(comFiltro?.where).toMatchObject({ userId: 'u', quantity: { gt: 0 } });
    expect(semFiltro?.where).toMatchObject({ userId: 'u', quantity: undefined });
  });

  it('summarizeByUser soma unidades, conta cartas diferentes com quantidade e itens anunciados', async () => {
    const { collectionItem, db } = fakeDb();
    collectionItem.aggregate.mockResolvedValue({ _sum: { quantity: 7 } });
    collectionItem.groupBy.mockResolvedValue([{ cardId: 'base1-4' }, { cardId: 'base1-88' }]);
    collectionItem.count.mockResolvedValue(1);

    expect(await new PrismaCollectionRepository(db).summarizeByUser('u')).toEqual({
      totalUnits: 7,
      distinctCards: 2,
      listedItems: 1,
    });
    expect(collectionItem.groupBy).toHaveBeenCalledWith({ by: ['cardId'], where: { userId: 'u', quantity: { gt: 0 } } });
  });

  it('summarizeByUser de coleção vazia devolve zeros', async () => {
    const { collectionItem, db } = fakeDb();
    collectionItem.aggregate.mockResolvedValue({ _sum: { quantity: null } });

    expect(await new PrismaCollectionRepository(db).summarizeByUser('u')).toEqual({
      totalUnits: 0,
      distinctCards: 0,
      listedItems: 0,
    });
  });
});
