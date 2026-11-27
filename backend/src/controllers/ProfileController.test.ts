import { jest } from '@jest/globals';
import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

import type { PublicCollection } from '../services/ProfileService.js';
import { ProfileController, type ProfileActions } from './ProfileController.js';

const data: PublicCollection = {
  user: { username: 'ash', name: 'Ash', createdAt: new Date('2026-01-01T00:00:00Z') },
  items: [],
};

function setup() {
  const profiles = {
    searchCollectors: jest.fn<ProfileActions['searchCollectors']>(),
    getPublicCollection: jest.fn<ProfileActions['getPublicCollection']>(async () => data),
    getPublicCollectionPage: jest.fn<ProfileActions['getPublicCollectionPage']>(async () => ({
      ...data,
      hasNextPage: true,
    })),
  } satisfies ProfileActions;

  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };

  return { profiles, res, controller: new ProfileController(profiles) };
}

const next = jest.fn() as unknown as NextFunction;

describe('ProfileController', () => {
  it('publicCollection responde 200 com o perfil público', async () => {
    const { profiles, res, controller } = setup();

    await controller.publicCollection(
      { params: { username: 'ash' }, query: {} } as unknown as Request,
      res as unknown as Response,
      next,
    );

    expect(profiles.getPublicCollection).toHaveBeenCalledWith('ash');
    expect(profiles.getPublicCollectionPage).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, data });
  });

  it('publicCollection com limit pagina e mantém user em data', async () => {
    const { profiles, res, controller } = setup();

    await controller.publicCollection(
      { params: { username: 'ash' }, query: { limit: '1' } } as unknown as Request,
      res as unknown as Response,
      next,
    );

    expect(profiles.getPublicCollectionPage).toHaveBeenCalledWith('ash', {}, { page: 1, limit: 1 });
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { user: data.user, items: [] },
      pagination: { page: 1, limit: 1, hasNextPage: true },
    });
  });

  it('username inválido falha na validação', async () => {
    const { profiles, res, controller } = setup();

    await expect(
      controller.publicCollection(
        { params: { username: 'A!' }, query: {} } as unknown as Request,
        res as unknown as Response,
        next,
      ),
    ).rejects.toBeInstanceOf(ZodError);
    expect(profiles.getPublicCollection).not.toHaveBeenCalled();
  });
});
