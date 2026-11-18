import { jest } from '@jest/globals';
import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

import type { WishlistItemView } from '../services/WishlistService.js';
import type { AuthUser } from '../types/auth.js';
import { WishlistController, type WishlistActions } from './WishlistController.js';

const misty = { id: 'u-misty', username: 'misty' } as AuthUser;
const ITEM_ID = 'f323730d-c965-42b2-b3f4-a059e009dfe7';
const item = { id: ITEM_ID, cardId: 'base1-4', opportunities: 1 } as WishlistItemView;

function setup() {
  const wishlist = {
    list: jest.fn<WishlistActions['list']>(async () => [item]),
    listPage: jest.fn<WishlistActions['listPage']>(async () => ({ items: [item], hasNextPage: false })),
    add: jest.fn<WishlistActions['add']>(async () => item),
    remove: jest.fn<WishlistActions['remove']>(async () => undefined),
  } satisfies WishlistActions;

  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
  };

  return { wishlist, res, controller: new WishlistController(wishlist) };
}

const next = jest.fn() as unknown as NextFunction;
const request = (parts: Partial<Request>) => ({ user: misty, ...parts }) as Request;

describe('WishlistController', () => {
  it('list responde 200 com os itens', async () => {
    const { wishlist, res, controller } = setup();

    await controller.list(request({ query: {} }), res as unknown as Response, next);

    expect(wishlist.list).toHaveBeenCalledWith('u-misty');
    expect(wishlist.listPage).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: { items: [item] } });
  });

  it('list com type pagina e devolve pagination', async () => {
    const { wishlist, res, controller } = setup();

    await controller.list(request({ query: { type: 'fire', page: '2', limit: '5' } }), res as unknown as Response, next);

    expect(wishlist.listPage).toHaveBeenCalledWith('u-misty', { type: 'Fire' }, { page: 2, limit: 5 });
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { items: [item] },
      pagination: { page: 2, limit: 5, hasNextPage: false },
    });
  });

  it('add valida o corpo e responde 201 com o item', async () => {
    const { wishlist, res, controller } = setup();

    await controller.add(request({ body: { cardId: ' base1-4 ' } }), res as unknown as Response, next);

    expect(wishlist.add).toHaveBeenCalledWith('u-misty', { cardId: 'base1-4', lang: 'en' });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: { item } });
  });

  it('add com campo desconhecido falha na validação', async () => {
    const { wishlist, res, controller } = setup();

    await expect(
      controller.add(request({ body: { cardId: 'base1-4', finish: 'HOLO' } }), res as unknown as Response, next),
    ).rejects.toBeInstanceOf(ZodError);
    expect(wishlist.add).not.toHaveBeenCalled();
  });

  it('remove valida o id e responde 204', async () => {
    const { wishlist, res, controller } = setup();

    await controller.remove(request({ params: { id: ITEM_ID } }), res as unknown as Response, next);

    expect(wishlist.remove).toHaveBeenCalledWith('u-misty', ITEM_ID);
    expect(res.status).toHaveBeenCalledWith(204);
    expect(res.send).toHaveBeenCalledWith();
  });
});
