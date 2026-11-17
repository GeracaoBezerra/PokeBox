import { jest } from '@jest/globals';

import { ConflictError } from '../errors/domainErrors.js';
import type { Db } from '../lib/prisma.js';
import { PrismaWishlistRepository } from './PrismaWishlistRepository.js';

function fakeDb() {
  const wishlistItem = {
    create: jest.fn<(args: unknown) => Promise<unknown>>(),
    deleteMany: jest.fn<(args: unknown) => Promise<{ count: number }>>(),
  };
  return { wishlistItem, db: { wishlistItem } as unknown as Db };
}

describe('PrismaWishlistRepository', () => {
  it('create com chave repetida (P2002) vira ConflictError', async () => {
    const { wishlistItem, db } = fakeDb();
    wishlistItem.create.mockRejectedValue({ code: 'P2002' });

    const error = await new PrismaWishlistRepository(db).create({ userId: 'u', cardId: 'c' }).catch((err) => err);

    expect(error).toBeInstanceOf(ConflictError);
    expect(error).toMatchObject({ statusCode: 409, message: 'Esta carta já está na sua wishlist' });
  });

  it('create repassa outros erros', async () => {
    const { wishlistItem, db } = fakeDb();
    const boom = new Error('boom');
    wishlistItem.create.mockRejectedValue(boom);

    await expect(new PrismaWishlistRepository(db).create({ userId: 'u', cardId: 'c' })).rejects.toBe(boom);
  });

  it.each([
    [1, true],
    [0, false],
  ])('removeByUserAndCard com %i linha(s) apagada(s) devolve %s', async (count, expected) => {
    const { wishlistItem, db } = fakeDb();
    wishlistItem.deleteMany.mockResolvedValue({ count });

    expect(await new PrismaWishlistRepository(db).removeByUserAndCard('u', 'c')).toBe(expected);
    expect(wishlistItem.deleteMany).toHaveBeenCalledWith({ where: { userId: 'u', cardId: 'c' } });
  });

  it('removeByUserAndCard usa a transação de quem chama', async () => {
    const own = fakeDb();
    const tx = fakeDb();
    tx.wishlistItem.deleteMany.mockResolvedValue({ count: 1 });

    await new PrismaWishlistRepository(own.db).removeByUserAndCard('u', 'c', tx.db);

    expect(tx.wishlistItem.deleteMany).toHaveBeenCalled();
    expect(own.wishlistItem.deleteMany).not.toHaveBeenCalled();
  });
});

describe('PrismaWishlistRepository.findMostWished', () => {
  test('filtra contas utilizáveis, desempata por id e mantém a ordem do ranking', async () => {
    const groupBy = jest.fn<(args: unknown) => Promise<unknown[]>>().mockResolvedValue([
      { cardId: 'base1-4', _count: { cardId: 3 } },
      { cardId: 'base1-58', _count: { cardId: 1 } },
    ]);
    const findMany = jest.fn<(args: unknown) => Promise<unknown[]>>().mockResolvedValue([
      { id: 'base1-58', name: 'Pikachu' }, { id: 'base1-4', name: 'Charizard' },
    ]);
    const db = { wishlistItem: { groupBy }, card: { findMany } } as unknown as Db;
    const result = await new PrismaWishlistRepository(db).findMostWished(8);
    expect(groupBy).toHaveBeenCalledWith({
      by: ['cardId'],
      where: { user: { deletedAt: null, accountStatus: { in: ['ACTIVE', 'PENDING_VERIFICATION'] } } },
      _count: { cardId: true },
      orderBy: [{ _count: { cardId: 'desc' } }, { cardId: 'asc' }],
      take: 8,
    });
    expect(findMany).toHaveBeenCalledWith({ where: { id: { in: ['base1-4', 'base1-58'] } } });
    expect(result).toEqual([
      { rank: 1, wishlistCount: 3, card: { id: 'base1-4', name: 'Charizard' } },
      { rank: 2, wishlistCount: 1, card: { id: 'base1-58', name: 'Pikachu' } },
    ]);
  });
  test('ranking vazio não consulta cartas', async () => {
    const groupBy = jest.fn<(args: unknown) => Promise<unknown[]>>().mockResolvedValue([]);
    const findMany = jest.fn();
    const db = { wishlistItem: { groupBy }, card: { findMany } } as unknown as Db;
    await expect(new PrismaWishlistRepository(db).findMostWished(8)).resolves.toEqual([]);
    expect(findMany).not.toHaveBeenCalled();
  });
});
