import { jest } from '@jest/globals';
import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

import { AppError } from '../errors/AppError.js';
import type { AuthUser } from '../types/auth.js';
import { UserController, type UserActions } from './UserController.js';

const ash = { id: 'u-ash', username: 'ash' } as AuthUser;

function setup() {
  const users = {
    updateMe: jest.fn<UserActions['updateMe']>(async (_id, changes) => ({ ...ash, ...changes }) as AuthUser),
    deactivateMe: jest.fn<UserActions['deactivateMe']>(async () => undefined),
  } satisfies UserActions;

  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
  };

  return { users, res, controller: new UserController(users) };
}

const next = jest.fn() as unknown as NextFunction;
const request = (body: unknown, user: AuthUser | undefined = ash) => ({ body, user }) as Request;

describe('UserController', () => {
  it('updateMe valida o corpo e responde 200 com o usuário', async () => {
    const { users, res, controller } = setup();

    await controller.updateMe(request({ state: 'ce' }), res as unknown as Response, next);

    expect(users.updateMe).toHaveBeenCalledWith('u-ash', { state: 'CE' });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: { user: { ...ash, state: 'CE' } } });
  });

  it('updateMe com CEP de 7 dígitos falha na validação', async () => {
    const { users, res, controller } = setup();

    await expect(controller.updateMe(request({ cep: '6000000' }), res as unknown as Response, next)).rejects.toBeInstanceOf(
      ZodError,
    );
    expect(users.updateMe).not.toHaveBeenCalled();
  });

  it('deleteMe desativa e responde 204 sem corpo', async () => {
    const { users, res, controller } = setup();

    await controller.deleteMe(request(undefined), res as unknown as Response, next);

    expect(users.deactivateMe).toHaveBeenCalledWith('u-ash');
    expect(res.status).toHaveBeenCalledWith(204);
    expect(res.send).toHaveBeenCalledWith();
  });

  it('sem usuário na requisição devolve 401', async () => {
    const { controller, res } = setup();

    await expect(controller.deleteMe({ body: undefined } as Request, res as unknown as Response, next)).rejects.toEqual(
      new AppError(401, 'Autenticação necessária'),
    );
  });
});
