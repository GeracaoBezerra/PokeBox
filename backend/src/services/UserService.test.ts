import { jest } from '@jest/globals';

import type { TradeUnitOfWork, UnitOfWorkFactory } from '../repositories/UnitOfWork.js';
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

function setup(hasOpenTrade = false) {
  const calls: string[] = [];
  const users = {
    update: jest.fn<UserAccountStore['update']>(async (_id, data) => ({ ...misty, ...data })),
  };
  const uow = {
    trades: { hasOpenFor: jest.fn(async () => (calls.push('trocas'), hasOpenTrade)) },
    offers: { cancelOpenOfUser: jest.fn(async () => calls.push('ofertas')) },
    listings: { closeOpenByOwner: jest.fn(async () => calls.push('anúncios')) },
    users: { deactivate: jest.fn(async () => void calls.push('conta')) },
  };
  const unitOfWork: UnitOfWorkFactory = {
    run: (work) => work(uow as unknown as TradeUnitOfWork),
  };

  return { users, uow, calls, service: new UserService(users, unitOfWork) };
}

describe('UserService', () => {
  it('updateMe grava as mudanças no usuário logado e devolve o perfil', async () => {
    const { users, service } = setup();

    const user = await service.updateMe('u-misty', { city: 'Fortaleza' });

    expect(users.update).toHaveBeenCalledWith('u-misty', { city: 'Fortaleza' });
    expect(user.city).toBe('Fortaleza');
  });

  it('deactivateMe cancela as ofertas, fecha os anúncios e desativa só o usuário logado', async () => {
    const { uow, calls, service } = setup();

    await service.deactivateMe('u-misty');

    expect(uow.offers.cancelOpenOfUser).toHaveBeenCalledWith('u-misty', 'ACCOUNT_DEACTIVATED');
    expect(uow.listings.closeOpenByOwner).toHaveBeenCalledWith('u-misty');
    expect(uow.users.deactivate).toHaveBeenCalledWith('u-misty');
    expect(calls).toEqual(['ofertas', 'trocas', 'anúncios', 'conta']);
  });

  it('deactivateMe confere troca aberta depois de travar as ofertas e dá 409 sem fechar anúncios nem desativar', async () => {
    const { uow, calls, service } = setup(true);

    await expect(service.deactivateMe('u-misty')).rejects.toMatchObject({
      statusCode: 409,
      message: 'Conclua ou cancele suas trocas antes de desativar a conta.',
    });
    expect(calls).toEqual(['ofertas', 'trocas']);
    expect(uow.listings.closeOpenByOwner).not.toHaveBeenCalled();
    expect(uow.users.deactivate).not.toHaveBeenCalled();
  });
});
