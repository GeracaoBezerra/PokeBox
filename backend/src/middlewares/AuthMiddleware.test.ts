import { jest } from '@jest/globals';
import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

import { AppError } from '../errors/AppError.js';
import type { AuthUser } from '../types/auth.js';
import { AuthMiddleware, type UserLookup } from './AuthMiddleware.js';

const SECRET = 'segredo-de-teste-com-16+';

const ash: AuthUser = {
  id: 'u-ash',
  username: 'ash',
  name: 'Ash Ketchum',
  email: 'ash@pokebox.dev',
  role: 'USER',
  accountStatus: 'ACTIVE',
  createdAt: new Date('2026-01-01'),
  phone: null,
  cep: null,
  street: null,
  number: null,
  complement: null,
  neighborhood: null,
  city: null,
  state: null,
};

function setup(user: AuthUser | null = ash) {
  const users: UserLookup = { findById: jest.fn(async () => user) };
  return { users, auth: new AuthMiddleware({ users, jwtSecret: SECRET }) };
}

function request(authorization?: string, user?: AuthUser) {
  return { headers: { authorization }, user } as unknown as Request;
}

const res = {} as Response;

async function run(handler: (req: Request, res: Response, next: NextFunction) => unknown, req: Request) {
  const next = jest.fn();
  await handler(req, res, next as unknown as NextFunction);
  return next;
}

const bearer = (token: string) => `Bearer ${token}`;
const tokenFor = (sub: string, secret = SECRET) => jwt.sign({ sub }, secret, { algorithm: 'HS256' });

describe('AuthMiddleware.requireAuth', () => {
  it('sem header devolve 401 de token ausente', async () => {
    const { auth } = setup();
    const next = await run(auth.requireAuth, request());

    expect(next).toHaveBeenCalledWith(new AppError(401, 'Token de autenticação ausente'));
  });

  it('esquema diferente de Bearer conta como token ausente', async () => {
    const { auth } = setup();
    const next = await run(auth.requireAuth, request('Basic abc'));

    expect((next.mock.calls[0][0] as AppError).message).toBe('Token de autenticação ausente');
  });

  it('token assinado com outro segredo devolve 401', async () => {
    const { auth } = setup();
    const next = await run(auth.requireAuth, request(bearer(tokenFor('u-ash', 'outro-segredo-qualquer'))));

    expect((next.mock.calls[0][0] as AppError).message).toBe('Token inválido ou expirado');
  });

  it('usuário inexistente devolve sessão inválida', async () => {
    const { auth } = setup(null);
    const next = await run(auth.requireAuth, request(bearer(tokenFor('u-ash'))));

    expect((next.mock.calls[0][0] as AppError).message).toBe('Sessão inválida');
  });

  it('conta inativa devolve sessão inválida', async () => {
    const { auth } = setup({ ...ash, accountStatus: 'INACTIVE' });
    const next = await run(auth.requireAuth, request(bearer(tokenFor('u-ash'))));

    expect((next.mock.calls[0][0] as AppError).statusCode).toBe(401);
  });

  it('token válido coloca o usuário em req.user', async () => {
    const { auth, users } = setup();
    const req = request(bearer(tokenFor('u-ash')));
    const next = await run(auth.requireAuth, req);

    expect(users.findById).toHaveBeenCalledWith('u-ash');
    expect(req.user).toEqual(ash);
    expect(next).toHaveBeenCalledWith();
  });
});

describe('AuthMiddleware.optionalAuth', () => {
  it('sem header segue sem usuário', async () => {
    const { auth, users } = setup();
    const req = request();
    const next = await run(auth.optionalAuth, req);

    expect(next).toHaveBeenCalledWith();
    expect(req.user).toBeUndefined();
    expect(users.findById).not.toHaveBeenCalled();
  });

  it('com header valida como o requireAuth', async () => {
    const { auth } = setup();
    const req = request(bearer(tokenFor('u-ash')));
    await run(auth.optionalAuth, req);

    expect(req.user).toEqual(ash);
  });
});

describe('AuthMiddleware.requireRole', () => {
  it('sem usuário autenticado lança 401', () => {
    const { auth } = setup();

    expect(() => auth.requireRole('ADMIN')(request(), res, jest.fn())).toThrow('Autenticação necessária');
  });

  it('papel diferente lança 403', () => {
    const { auth } = setup();

    expect(() => auth.requireRole('ADMIN')(request(undefined, ash), res, jest.fn())).toThrow(
      'Você não tem permissão para esta ação',
    );
  });

  it('papel permitido segue', () => {
    const { auth } = setup();
    const next = jest.fn();
    auth.requireRole('ADMIN')(request(undefined, { ...ash, role: 'ADMIN' }), res, next);

    expect(next).toHaveBeenCalledWith();
  });
});
