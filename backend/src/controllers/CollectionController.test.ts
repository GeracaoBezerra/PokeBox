import { jest } from '@jest/globals';
import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

import type { CollectionItemView, OwnCollectionItemView } from '../services/CollectionService.js';
import type { AuthUser } from '../types/auth.js';
import { CollectionController, type CollectionActions } from './CollectionController.js';

const ash = { id: 'u-ash', username: 'ash' } as AuthUser;
const ITEM_ID = 'f323730d-c965-42b2-b3f4-a059e009dfe7';
const item = { id: ITEM_ID, quantity: 1, available: 1 } as CollectionItemView;
const ownItem = { ...item, deleteBlockedBy: null } as OwnCollectionItemView;
const summary = { totalUnits: 3, distinctCards: 2, listedItems: 1 };

function setup() {
  const collection = {
    list: jest.fn<CollectionActions['list']>(async () => [ownItem]),
    listPage: jest.fn<CollectionActions['listPage']>(async () => ({ items: [ownItem], hasNextPage: true })),
    summary: jest.fn<CollectionActions['summary']>(async () => summary),
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

    await controller.list(request({ query: {} }), res as unknown as Response, next);

    expect(collection.list).toHaveBeenCalledWith('u-ash');
    expect(collection.listPage).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: { items: [ownItem] } });
  });

  it('list com filtro pagina mesmo sem page', async () => {
    const { collection, res, controller } = setup();

    await controller.list(request({ query: { q: 'charizard', isPublic: 'false' } }), res as unknown as Response, next);

    expect(collection.list).not.toHaveBeenCalled();
    expect(collection.listPage).toHaveBeenCalledWith(
      'u-ash',
      { q: 'charizard', isPublic: false },
      { page: 1, limit: 20 },
    );
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { items: [ownItem] },
      pagination: { page: 1, limit: 20, hasNextPage: true },
    });
  });

  it('list com withZero=false pagina e repassa o filtro', async () => {
    const { collection, res, controller } = setup();

    await controller.list(request({ query: { withZero: 'false' } }), res as unknown as Response, next);

    expect(collection.listPage).toHaveBeenCalledWith('u-ash', { withZero: false }, { page: 1, limit: 20 });
  });

  it('summary responde 200 com os totais do usuário', async () => {
    const { collection, res, controller } = setup();

    await controller.summary(request({}), res as unknown as Response, next);

    expect(collection.summary).toHaveBeenCalledWith('u-ash');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: summary });
  });

  it('list com limit acima de 100 falha na validação', async () => {
    const { collection, res, controller } = setup();

    await expect(
      controller.list(request({ query: { limit: '500' } }), res as unknown as Response, next),
    ).rejects.toBeInstanceOf(ZodError);
    expect(collection.listPage).not.toHaveBeenCalled();
  });

  it('add responde 201 com o item e removedFromWishlist', async () => {
    const { collection, res, controller } = setup();
    const body = { cardId: 'base1-4', quantity: 1, finish: 'HOLO', firstEdition: false };

    await controller.add(request({ body }), res as unknown as Response, next);

    expect(collection.add).toHaveBeenCalledWith('u-ash', { ...body, lang: 'en' });
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
