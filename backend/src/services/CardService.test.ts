import { jest } from '@jest/globals';

import type { CardCatalog } from '../cards/catalog/CardCatalog.js';
import type { CardFinder } from '../cards/search/CardFinder.js';
import { AppError } from '../errors/AppError.js';
import { CardNotFoundError } from '../errors/CardNotFoundError.js';
import { TcgdexUnavailableError } from '../errors/TcgdexUnavailableError.js';
import { cardMock } from '../mocks/cardMock.js';
import { CardService, type UserCardReaders } from './CardService.js';

function setup() {
  const catalog: jest.Mocked<CardCatalog> = {
    getById: jest.fn<CardCatalog['getById']>(async () => cardMock),
    search: jest.fn<CardCatalog['search']>(async () => []),
    listSets: jest.fn<CardCatalog['listSets']>(async () => []),
    listSetCards: jest.fn<CardCatalog['listSetCards']>(async () => []),
  };
  const finder: jest.Mocked<CardFinder> = {
    find: jest.fn<CardFinder['find']>(async () => ({ cards: [], hasNextPage: false, search: null })),
  };
  const readers = {
    collection: { sumQuantityByUserAndCard: jest.fn<UserCardReaders['collection']['sumQuantityByUserAndCard']>(async () => null) },
    wishlist: { existsByUserAndCard: jest.fn<UserCardReaders['wishlist']['existsByUserAndCard']>(async () => null) },
    listings: { existsActiveByUserAndCard: jest.fn<UserCardReaders['listings']['existsActiveByUserAndCard']>(async () => null) },
  };
  return { catalog, finder, readers, service: new CardService(catalog, finder, readers) };
}

describe('CardService', () => {
  test('getById repassa id e idioma para o catálogo', async () => {
    const { service, catalog } = setup();

    await expect(service.getById('base1-4', 'pt')).resolves.toBe(cardMock);
    expect(catalog.getById).toHaveBeenCalledWith('base1-4', 'pt');
  });

  test('find usa o buscador', async () => {
    const { service, finder } = setup();
    const query = { lang: 'en', name: 'charizard', page: 1, limit: 20 };

    await service.find(query);

    expect(finder.find).toHaveBeenCalledWith(query);
  });

  test('fetchCard busca sempre em inglês', async () => {
    const { service, catalog } = setup();

    await service.fetchCard('base1-4');

    expect(catalog.getById).toHaveBeenCalledWith('base1-4', 'en');
  });

  test('fetchCard de carta inexistente vira 404 Carta não encontrada', async () => {
    const { service, catalog } = setup();
    catalog.getById.mockRejectedValue(new CardNotFoundError('Carta x não encontrada'));

    const err = await service.fetchCard('x').catch((e: unknown) => e);

    expect(err).toBeInstanceOf(AppError);
    expect(err).toMatchObject({ statusCode: 404, message: 'Carta não encontrada' });
  });

  test('fetchCard repassa a TCGdex fora do ar', async () => {
    const { service, catalog } = setup();
    catalog.getById.mockRejectedValue(new TcgdexUnavailableError('fora'));

    await expect(service.fetchCard('base1-4')).rejects.toBeInstanceOf(TcgdexUnavailableError);
  });

  test('getUserCardInfo junta coleção, wishlist e anúncio ativo', async () => {
    const { service, readers } = setup();
    readers.collection.sumQuantityByUserAndCard.mockResolvedValue(2);
    readers.wishlist.existsByUserAndCard.mockResolvedValue({ id: 'w1' });

    await expect(service.getUserCardInfo('user-1', 'base1-4')).resolves.toEqual({
      inCollection: 2,
      inWishlist: true,
      onTradeList: false,
    });
    expect(readers.collection.sumQuantityByUserAndCard).toHaveBeenCalledWith('user-1', 'base1-4');
    expect(readers.wishlist.existsByUserAndCard).toHaveBeenCalledWith('user-1', 'base1-4');
    expect(readers.listings.existsActiveByUserAndCard).toHaveBeenCalledWith('user-1', 'base1-4');
  });
});
