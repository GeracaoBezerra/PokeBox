import { jest } from '@jest/globals';

import type { CardDetail } from '../cards/types.js';
import type { Card } from '../generated/prisma/index.js';
import { ConflictError } from '../errors/domainErrors.js';
import type { WishlistItem, WishlistItemWithCard } from '../repositories/WishlistRepository.js';
import type { CardFetcher } from './CardService.js';
import {
  WishlistService,
  type CardWriter,
  type WishlistCollectionReader,
  type WishlistStore,
} from './WishlistService.js';

const USER_ID = 'user-id';

const card = { id: 'base1-2', name: 'Blastoise', number: '2', set: { id: 'base1', name: 'Base Set' } } as CardDetail;

const storedCard = { id: 'base1-2', name: 'Blastoise', marketPrice: null } as Card;

const savedItem: WishlistItemWithCard = {
  id: 'wish-id',
  userId: USER_ID,
  cardId: 'base1-2',
  createdAt: new Date('2026-11-01T00:00:00Z'),
  card: storedCard,
};

function setup() {
  const wishlist = {
    findManyByUser: jest.fn<WishlistStore['findManyByUser']>(async () => []),
    findById: jest.fn<WishlistStore['findById']>(async () => null),
    create: jest.fn<WishlistStore['create']>(async () => savedItem),
    remove: jest.fn<WishlistStore['remove']>(async () => undefined),
  } satisfies WishlistStore;
  const collection = {
    findOwnersOfCards: jest.fn<WishlistCollectionReader['findOwnersOfCards']>(async () => []),
    sumQuantityByUserAndCard: jest.fn<WishlistCollectionReader['sumQuantityByUserAndCard']>(async () => null),
  } satisfies WishlistCollectionReader;
  const cards = {
    fetchCard: jest.fn<CardFetcher['fetchCard']>(async () => card),
  } satisfies CardFetcher;
  const cardStore = {
    upsertCard: jest.fn<CardWriter['upsertCard']>(async () => storedCard),
  } satisfies CardWriter;

  return { wishlist, collection, cards, cardStore, service: new WishlistService(wishlist, collection, cards, cardStore) };
}

describe('WishlistService.list', () => {
  it('conta as oportunidades por carta, pedindo os donos sem a própria pessoa', async () => {
    const { wishlist, collection, service } = setup();
    const other = { ...savedItem, id: 'wish-2', cardId: 'base1-4', card: { ...storedCard, id: 'base1-4' } };
    wishlist.findManyByUser.mockResolvedValue([savedItem, other]);
    collection.findOwnersOfCards.mockResolvedValue([
      { cardId: 'base1-2', userId: 'ash' },
      { cardId: 'base1-2', userId: 'brock' },
    ]);

    const items = await service.list(USER_ID);

    expect(collection.findOwnersOfCards).toHaveBeenCalledWith(['base1-2', 'base1-4'], USER_ID);
    expect(items.map((item) => item.opportunities)).toEqual([2, 0]);
    expect(items[0]).not.toHaveProperty('userId');
  });

  it('wishlist vazia não consulta donos', async () => {
    const { collection, service } = setup();

    expect(await service.list(USER_ID)).toEqual([]);
    expect(collection.findOwnersOfCards).not.toHaveBeenCalled();
  });
});

describe('WishlistService.add (RN-12)', () => {
  it('carta que a pessoa já tem na coleção dá 409 e não grava', async () => {
    const { collection, cardStore, wishlist, service } = setup();
    collection.sumQuantityByUserAndCard.mockResolvedValue(1);

    await expect(service.add(USER_ID, { cardId: 'BASE1-2' })).rejects.toMatchObject({
      statusCode: 409,
      message: 'Você já tem esta carta na sua coleção',
    });
    expect(collection.sumQuantityByUserAndCard).toHaveBeenCalledWith(USER_ID, 'base1-2');
    expect(cardStore.upsertCard).not.toHaveBeenCalled();
    expect(wishlist.create).not.toHaveBeenCalled();
  });

  it.each([
    ['quantidade zerada', 0],
    ['nenhum item', null],
  ])('%s deixa adicionar', async (_label, sum) => {
    const { collection, wishlist, service } = setup();
    collection.sumQuantityByUserAndCard.mockResolvedValue(sum);

    await service.add(USER_ID, { cardId: 'base1-2' });

    expect(wishlist.create).toHaveBeenCalledWith({ userId: USER_ID, cardId: 'base1-2' });
  });

  it('grava a carta antes do item e devolve com as oportunidades', async () => {
    const { cardStore, collection, wishlist, service } = setup();
    collection.findOwnersOfCards.mockResolvedValue([{ cardId: 'base1-2', userId: 'ash' }]);

    const item = await service.add(USER_ID, { cardId: 'base1-2' });

    expect(cardStore.upsertCard).toHaveBeenCalledWith(expect.objectContaining({ id: 'base1-2', setId: 'base1' }));
    expect(cardStore.upsertCard.mock.invocationCallOrder[0]).toBeLessThan(wishlist.create.mock.invocationCallOrder[0]);
    expect(item).toEqual({
      id: 'wish-id',
      cardId: 'base1-2',
      card: storedCard,
      createdAt: savedItem.createdAt,
      opportunities: 1,
    });
  });

  it('carta repetida na wishlist continua dando 409', async () => {
    const { wishlist, service } = setup();
    wishlist.create.mockRejectedValue(new ConflictError('Esta carta já está na sua wishlist'));

    await expect(service.add(USER_ID, { cardId: 'base1-2' })).rejects.toMatchObject({
      statusCode: 409,
      message: 'Esta carta já está na sua wishlist',
    });
  });
});

describe('WishlistService.remove', () => {
  const own: WishlistItem = { id: 'wish-id', userId: USER_ID, cardId: 'base1-2', createdAt: new Date() };

  it('item inexistente dá 404', async () => {
    const { wishlist, service } = setup();

    await expect(service.remove(USER_ID, 'nao-existe')).rejects.toMatchObject({
      statusCode: 404,
      message: 'Item da wishlist não encontrado',
    });
    expect(wishlist.remove).not.toHaveBeenCalled();
  });

  it('item de outra pessoa dá 403', async () => {
    const { wishlist, service } = setup();
    wishlist.findById.mockResolvedValue({ ...own, userId: 'outra' });

    await expect(service.remove(USER_ID, 'wish-id')).rejects.toMatchObject({
      statusCode: 403,
      message: 'Este item pertence a outro usuário',
    });
    expect(wishlist.remove).not.toHaveBeenCalled();
  });

  it('item próprio é apagado', async () => {
    const { wishlist, service } = setup();
    wishlist.findById.mockResolvedValue(own);

    await service.remove(USER_ID, 'wish-id');

    expect(wishlist.remove).toHaveBeenCalledWith('wish-id');
  });
});
