import { jest } from '@jest/globals';

import { AppError } from '../errors/AppError.js';
import type { AuthUserStore, PublicUser, UserWithCredentials } from '../repositories/UserRepository.js';
import type { PasswordHasher } from '../security/PasswordHasher.js';
import type { TokenSigner } from '../security/TokenSigner.js';
import { AuthService, INVALID_CREDENTIALS } from './AuthService.js';

const ash: PublicUser = {
  id: 'u-ash',
  username: 'ash',
  name: 'Ash Ketchum',
  email: 'ash@pokebox.dev',
  role: 'USER',
  accountStatus: 'ACTIVE',
  createdAt: new Date('2026-01-01'),
};

const ashWithPassword: UserWithCredentials = { ...ash, passwordHash: 'hash:pokebox123' };

function setup(stored: UserWithCredentials | null = ashWithPassword) {
  const users = {
    findByEmail: jest.fn<AuthUserStore['findByEmail']>(async () => stored),
    findByEmailOrUsername: jest.fn<AuthUserStore['findByEmailOrUsername']>(async () => null),
    create: jest.fn<AuthUserStore['create']>(async (data) => ({ ...ash, username: data.username, email: data.email })),
    touchLastLogin: jest.fn<AuthUserStore['touchLastLogin']>(async () => undefined),
  } satisfies AuthUserStore;

  const hasher = {
    hash: jest.fn<PasswordHasher['hash']>(async (plain) => `hash:${plain}`),
    compare: jest.fn<PasswordHasher['compare']>(async (plain, hash) => hash === `hash:${plain}`),
  } satisfies PasswordHasher;

  const tokens = { sign: jest.fn<TokenSigner['sign']>((userId) => `token-de-${userId}`) } satisfies TokenSigner;

  return { users, hasher, tokens, service: new AuthService(users, hasher, tokens) };
}

const newUser = { username: 'gary', name: 'Gary Oak', email: 'gary@pokebox.dev', password: 'senhaForte123' };

describe('AuthService.register', () => {
  it('cria o usuário com a senha em hash e devolve o token', async () => {
    const { users, service } = setup();

    const session = await service.register(newUser);

    expect(users.findByEmailOrUsername).toHaveBeenCalledWith('gary@pokebox.dev', 'gary');
    expect(users.create).toHaveBeenCalledWith({
      username: 'gary',
      name: 'Gary Oak',
      email: 'gary@pokebox.dev',
      passwordHash: 'hash:senhaForte123',
    });
    expect(session.token).toBe('token-de-u-ash');
    expect(session.user).not.toHaveProperty('passwordHash');
  });

  it('e-mail ou username repetido devolve 409 e não cria nada', async () => {
    const { users, service } = setup();
    users.findByEmailOrUsername.mockResolvedValueOnce({ id: 'u-ash', email: 'ash@pokebox.dev', username: 'ash' });

    await expect(service.register(newUser)).rejects.toMatchObject({
      statusCode: 409,
      message: 'E-mail ou username já cadastrado',
    });
    expect(users.create).not.toHaveBeenCalled();
  });
});

describe('AuthService.login', () => {
  it('login certo registra o último acesso e devolve token sem o hash', async () => {
    const { users, tokens, service } = setup();

    const session = await service.login({ email: 'ash@pokebox.dev', password: 'pokebox123' });

    expect(users.touchLastLogin).toHaveBeenCalledWith('u-ash');
    expect(tokens.sign).toHaveBeenCalledWith('u-ash');
    expect(session).toEqual({ user: ash, token: 'token-de-u-ash' });
  });

  it('senha errada devolve 401 com a mensagem genérica', async () => {
    const { users, service } = setup();

    await expect(service.login({ email: 'ash@pokebox.dev', password: 'errada' })).rejects.toEqual(
      new AppError(401, INVALID_CREDENTIALS),
    );
    expect(users.touchLastLogin).not.toHaveBeenCalled();
  });

  it('e-mail inexistente devolve o mesmo 401 e ainda compara com o hash falso', async () => {
    const { hasher, service } = setup(null);

    await expect(service.login({ email: 'ninguem@pokebox.dev', password: 'pokebox123' })).rejects.toEqual(
      new AppError(401, INVALID_CREDENTIALS),
    );
    expect(hasher.compare).toHaveBeenCalledWith('pokebox123', 'hash:dummy-password');
  });

  it.each(['INACTIVE', 'SUSPENDED'] as const)('conta %s devolve 403', async (accountStatus) => {
    const { users, service } = setup({ ...ashWithPassword, accountStatus });

    await expect(service.login({ email: 'ash@pokebox.dev', password: 'pokebox123' })).rejects.toMatchObject({
      statusCode: 403,
      message: 'Conta indisponível. Procure o suporte.',
    });
    expect(users.touchLastLogin).not.toHaveBeenCalled();
  });

  it('conta pendente de verificação consegue entrar', async () => {
    const { service } = setup({ ...ashWithPassword, accountStatus: 'PENDING_VERIFICATION' });

    await expect(service.login({ email: 'ash@pokebox.dev', password: 'pokebox123' })).resolves.toMatchObject({
      token: 'token-de-u-ash',
    });
  });
});
