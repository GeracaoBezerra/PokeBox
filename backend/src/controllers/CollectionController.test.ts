import { jest } from '@jest/globals';
import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

import type { CollectionItemView } from '../services/CollectionService.js';
import type { AuthUser } from '../types/auth.js';
import { CollectionController, type CollectionActions } from './CollectionController.js';

const ash = { id: 'u-ash', username: 'ash' } as AuthUser;
const ITEM_ID = 'f323730d-c965-42b2-b3f4-a059e009dfe7';
const item = { id: ITEM_ID, quantity: 1, available: 1 } as CollectionItemView;

function setup() {
  const collection = {
    list: jest.fn<CollectionActions['list']>(async () => [item]),
    add: jest.fn<CollectionActions['add']>(async () => ({ item, removedFromWishlist: true })),
    update: jest.fn<CollectionActions['update']>(async () => item),
    remove: jest.fn<CollectionActions['remove']>(async () => undefined),
  } satisfies CollectionActions;

  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
  };

  return { collection, res, controller: new CollectionController(collection) };
}

const next = jest.fn() as unknown as NextFunction;
const request = (parts: Partial<Request>) => ({ user: ash, ...parts }) as Request;

describe('CollectionController', () => {
  it('list responde 200 com os itens', async () => {
    const { collection, res, controller } = setup();

    await controller.list(request({}), res as unknown as Response, next);

    expect(collection.list).toHaveBeenCalledWith('u-ash');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: { items: [item] } });
  });

  it('add responde 201 com o item e removedFromWishlist', async () => {
    const { collection, res, controller } = setup();
    const body = { cardId: 'base1-4', quantity: 1, finish: 'HOLO', firstEdition: false };

    await controller.add(request({ body }), res as unknown as Response, next);

    expect(collection.add).toHaveBeenCalledWith('u-ash', body);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: { item, removedFromWishlist: true } });
  });

  it('update valida id e corpo e responde 200', async () => {
    const { collection, res, controller } = setup();

    await controller.update(
      request({ params: { id: ITEM_ID }, body: { isPublic: false } }),
      res as unknown as Response,
      next,
    );

    expect(collection.update).toHaveBeenCalledWith('u-ash', ITEM_ID, { isPublic: false });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: { item } });
  });

  it('update com corpo vazio falha na validação', async () => {
    const { collection, res, controller } = setup();

    await expect(
      controller.update(request({ params: { id: ITEM_ID }, body: {} }), res as unknown as Response, next),
    ).rejects.toBeInstanceOf(ZodError);
    expect(collection.update).not.toHaveBeenCalled();
  });

  it('remove responde 204 sem corpo', async () => {
    const { collection, res, controller } = setup();

    await controller.remove(request({ params: { id: ITEM_ID } }), res as unknown as Response, next);

    expect(collection.remove).toHaveBeenCalledWith('u-ash', ITEM_ID);
    expect(res.status).toHaveBeenCalledWith(204);
    expect(res.send).toHaveBeenCalledWith();
  });
});
