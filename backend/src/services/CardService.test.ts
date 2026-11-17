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
    listFilterValues: jest.fn<CardCatalog['listFilterValues']>(async () => ({ types: [], rarities: [], categories: [] })),
  };
  const finder: jest.Mocked<CardFinder> = {
    find: jest.fn<CardFinder['find']>(async () => ({ cards: [], hasNextPage: false, search: null })),
  };
  const readers = {
    collection: { sumQuantityByUserAndCard: jest.fn<UserCardReaders['collection']['sumQuantityByUserAndCard']>(async () => null) },
    wishlist: { findMostWished: jest.fn<UserCardReaders['wishlist']['findMostWished']>(async () => []), existsByUserAndCard: jest.fn<UserCardReaders['wishlist']['existsByUserAndCard']>(async () => null) },
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

    expect(finder.find).toHaveBeenCalledWith({ ...query, filters: {} });
  });

  test('find tira da lista as cartas com id que o detalhe recusa', async () => {
    const { service, finder } = setup();
    const card = (id: string) => ({
      id,
      localId: id,
      number: id,
      name: 'Unown',
      set: { id: 'exu', name: 'Unseen Forces' },
      image: { small: null, large: null },
    });
    finder.find.mockResolvedValueOnce({
      cards: [card('exu-!'), card('exu-A'), card('exu-%3F')],
      hasNextPage: true,
      search: null,
    });

    const result = await service.find({ lang: 'en', page: 1, limit: 3 });

    expect(result.cards.map((item) => item.id)).toEqual(['exu-A']);
    expect(result.hasNextPage).toBe(true);
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

describe('CardService filtros (#75)', () => {
  const values = { types: ['Fire', 'Water'], rarities: ['Rare Holo'], categories: ['Pokemon', 'Trainer'] };

  test('sem tipo, raridade ou categoria não consulta as listas da TCGdex', async () => {
    const { service, catalog, finder } = setup();

    await service.find({ lang: 'en', page: 1, limit: 20, filters: { set: 'base1' } });

    expect(catalog.listFilterValues).not.toHaveBeenCalled();
    expect(finder.find).toHaveBeenCalledWith(expect.objectContaining({ filters: { set: 'base1' } }));
  });

  test('aceita o valor em qualquer caixa e repassa como a TCGdex escreve', async () => {
    const { service, catalog, finder } = setup();
    catalog.listFilterValues.mockResolvedValue(values);

    await service.find({ lang: 'en', page: 1, limit: 20, filters: { type: 'fire', rarity: 'rare holo', category: 'TRAINER' } });

    expect(catalog.listFilterValues).toHaveBeenCalledWith('en');
    expect(finder.find).toHaveBeenCalledWith(
      expect.objectContaining({ filters: { type: 'Fire', rarity: 'Rare Holo', category: 'Trainer' } }),
    );
  });

  test('valor que não existe no idioma → 400 com details de cada campo', async () => {
    const { service, catalog, finder } = setup();
    catalog.listFilterValues.mockResolvedValue(values);

    const err = await service
      .find({ lang: 'en', page: 1, limit: 20, filters: { type: 'Fogo', category: 'Monstro' } })
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(AppError);
    expect((err as AppError).statusCode).toBe(400);
    expect((err as AppError).details).toEqual([
      { field: 'type', message: expect.stringContaining('Fogo') },
      { field: 'category', message: expect.stringContaining('Monstro') },
    ]);
    expect(finder.find).not.toHaveBeenCalled();
  });

  test('getFilterOptions junta as listas com id e nome dos sets', async () => {
    const { service, catalog } = setup();
    catalog.listFilterValues.mockResolvedValue(values);
    catalog.listSets.mockResolvedValue([{ id: 'base1', name: 'Base Set', logo: 'x', symbol: null, cardCount: { total: 102 } }]);

    await expect(service.getFilterOptions('en')).resolves.toEqual({ ...values, sets: [{ id: 'base1', name: 'Base Set' }] });
  });

  test('getFilterOptions com a TCGdex fora repassa o erro', async () => {
    const { service, catalog } = setup();
    catalog.listFilterValues.mockRejectedValue(new TcgdexUnavailableError('TCGdex respondeu 503'));

    await expect(service.getFilterOptions('en')).rejects.toBeInstanceOf(TcgdexUnavailableError);
  });
});

describe('CardService.mostWished', () => {
  test('usa o leitor local sem consultar o catálogo', async () => {
    const { service, readers, catalog, finder } = setup();
    await expect(service.mostWished(8)).resolves.toEqual([]);
    expect(readers.wishlist.findMostWished).toHaveBeenCalledWith(8);
    expect(catalog.getById).not.toHaveBeenCalled();
    expect(finder.find).not.toHaveBeenCalled();
  });
  test('propaga falhas do leitor', async () => {
    const { service, readers } = setup();
    const error = new Error('database unavailable');
    readers.wishlist.findMostWished.mockRejectedValueOnce(error);
    await expect(service.mostWished(8)).rejects.toBe(error);
  });
});
