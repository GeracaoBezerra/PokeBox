import { jest } from '@jest/globals';

import type { Card } from '../generated/prisma/index.js';
import type { CollectionItemWithCard, PublicCollectionReader } from '../repositories/CollectionRepository.js';
import type { PublicProfileUser } from '../repositories/UserRepository.js';
import { ProfileService, type PublicProfileLookup } from './ProfileService.js';

const ash: PublicProfileUser = {
  id: 'u-ash',
  username: 'ash',
  name: 'Ash Ketchum',
  accountStatus: 'ACTIVE',
  deletedAt: null,
  createdAt: new Date('2026-01-01T00:00:00Z'),
};

const item = {
  id: 'item-1',
  userId: 'u-ash',
  cardId: 'base1-4',
  quantity: 2,
  reservedQuantity: 1,
  condition: 'NEAR_MINT',
  finish: 'HOLO',
  firstEdition: false,
  isPublic: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  card: { id: 'base1-4', name: 'Charizard', marketPrice: null } as Card,
} satisfies CollectionItemWithCard;

function setup(user: PublicProfileUser | null = ash) {
  const users = {
    searchCollectors: jest.fn<PublicProfileLookup['searchCollectors']>(),
    findPublicByUsername: jest.fn<PublicProfileLookup['findPublicByUsername']>(async () => user),
  } satisfies PublicProfileLookup;
  const collection = {
    findPublicByUser: jest.fn<PublicCollectionReader['findPublicByUser']>(async () => [item]),
  } satisfies PublicCollectionReader;

  return { users, collection, service: new ProfileService(users, collection) };
}

it('busca uma linha extra para saber se há outra página de colecionadores', async () => {
  const { users, service } = setup();
  const collector = { username: 'ash', name: 'Ash Ketchum' };
  users.searchCollectors.mockResolvedValue([collector, { name: 'Ashley', username: 'ashley' }]);
  await expect(service.searchCollectors('ash', { page: 2, limit: 1 })).resolves.toEqual({
    items: [collector], hasNextPage: true,
  });
  expect(users.searchCollectors).toHaveBeenCalledWith('ash', { skip: 1, take: 2 });
});

describe('ProfileService.getPublicCollection (RN-10)', () => {
  it('devolve o usuário e só os campos públicos dos itens públicos', async () => {
    const { collection, service } = setup();

    const result = await service.getPublicCollection('ash');

    expect(collection.findPublicByUser).toHaveBeenCalledWith('u-ash');
    expect(result).toEqual({
      user: { username: 'ash', name: 'Ash Ketchum', createdAt: ash.createdAt },
      items: [
        {
          id: 'item-1',
          card: { id: 'base1-4', name: 'Charizard', marketPrice: null },
          quantity: 2,
          condition: 'NEAR_MINT',
          finish: 'HOLO',
          firstEdition: false,
        },
      ],
    });
  });

  it('usuário inexistente dá 404', async () => {
    const { collection, service } = setup(null);

    await expect(service.getPublicCollection('ninguem')).rejects.toMatchObject({
      statusCode: 404,
      message: 'Usuário não encontrado',
    });
    expect(collection.findPublicByUser).not.toHaveBeenCalled();
  });

  it.each([
    ['desativada', { ...ash, accountStatus: 'INACTIVE' as const, deletedAt: new Date() }],
    ['suspensa', { ...ash, accountStatus: 'SUSPENDED' as const }],
  ])('conta %s dá 404', async (_label, user) => {
    const { service } = setup(user);

    await expect(service.getPublicCollection('ash')).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe('ProfileService.getPublicCollectionPage', () => {
  it('pede skip/take com q e type e mantém o usuário na resposta', async () => {
    const { collection, service } = setup();
    collection.findPublicByUser.mockResolvedValue([item, { ...item, id: 'item-2' }]);

    const result = await service.getPublicCollectionPage('ash', { q: 'char', type: 'Fire' }, { page: 1, limit: 1 });

    expect(collection.findPublicByUser).toHaveBeenCalledWith('u-ash', { q: 'char', type: 'Fire', skip: 0, take: 2 });
    expect(result.user).toEqual({ username: 'ash', name: 'Ash Ketchum', createdAt: ash.createdAt });
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).not.toHaveProperty('isPublic');
    expect(result.hasNextPage).toBe(true);
  });

  it('usuário inexistente dá 404 sem consultar a coleção', async () => {
    const { collection, service } = setup(null);

    await expect(service.getPublicCollectionPage('ninguem', {}, { page: 1, limit: 20 })).rejects.toMatchObject({
      statusCode: 404,
    });
    expect(collection.findPublicByUser).not.toHaveBeenCalled();
  });
});
