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
