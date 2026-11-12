import { jest } from '@jest/globals';

import type { UserAccountStore } from '../repositories/UserRepository.js';
import type { AuthUser } from '../types/auth.js';
import { UserService } from './UserService.js';

const misty: AuthUser = {
  id: 'u-misty',
  username: 'misty',
  name: 'Misty',
  email: 'misty@pokebox.dev',
  role: 'USER',
  accountStatus: 'ACTIVE',
  createdAt: new Date('2026-01-01'),
  phone: null,
  cep: '60000000',
  street: null,
  number: null,
  complement: null,
  neighborhood: null,
  city: 'Cerulean',
  state: 'CE',
};

function setup() {
  const users = {
    update: jest.fn<UserAccountStore['update']>(async (_id, data) => ({ ...misty, ...data })),
    deactivate: jest.fn<UserAccountStore['deactivate']>(async () => undefined),
  } satisfies UserAccountStore;

  return { users, service: new UserService(users) };
}

describe('UserService', () => {
  it('updateMe grava as mudanças no usuário logado e devolve o perfil', async () => {
    const { users, service } = setup();

    const user = await service.updateMe('u-misty', { city: 'Fortaleza' });

    expect(users.update).toHaveBeenCalledWith('u-misty', { city: 'Fortaleza' });
    expect(user.city).toBe('Fortaleza');
  });

  it('deactivateMe desativa só o usuário logado', async () => {
    const { users, service } = setup();

    await service.deactivateMe('u-misty');

    expect(users.deactivate).toHaveBeenCalledWith('u-misty');
  });
});
