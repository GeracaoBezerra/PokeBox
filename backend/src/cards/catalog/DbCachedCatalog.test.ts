import { jest } from '@jest/globals';

import { CardNotFoundError } from '../../errors/CardNotFoundError.js';
import { TcgdexUnavailableError } from '../../errors/TcgdexUnavailableError.js';
import { cardMock } from '../../mocks/cardMock.js';
import type { CardDetail } from '../types.js';
import type { CardCacheStore, CachedCard } from './CardCacheStore.js';
import type { CardCatalog } from './CardCatalog.js';
import { DbCachedCatalog, type CardPriceWriter } from './DbCachedCatalog.js';

const ONE_DAY = 24 * 60 * 60 * 1000;
const NOW = new Date('2026-11-11T12:00:00Z').getTime();

const detail = (id: string, name = 'Charizard'): CardDetail => ({
  ...cardMock,
  id,
  name,
  marketPrice: { source: 'tcgplayer', value: 100, currency: 'USD', updatedAt: '2026-11-01' },
});

function fakeCatalog(): jest.Mocked<CardCatalog> {
  return {
    getById: jest.fn<CardCatalog['getById']>(async (_id, lang) => detail('base1-4', `Charizard ${lang}`)),
    search: jest.fn<CardCatalog['search']>(async () => []),
    listSets: jest.fn<CardCatalog['listSets']>(async () => []),
    listSetCards: jest.fn<CardCatalog['listSetCards']>(async () => []),
  };
}

function fakeStore(cached: CachedCard | null = null): jest.Mocked<CardCacheStore> {
  return {
    read: jest.fn<CardCacheStore['read']>(async () => cached),
    write: jest.fn<CardCacheStore['write']>(async () => {}),
  };
}

function setup(cached: CachedCard | null = null) {
  const inner = fakeCatalog();
  const store = fakeStore(cached);
  const prices: jest.Mocked<CardPriceWriter> = { refreshPrice: jest.fn<CardPriceWriter['refreshPrice']>(async () => {}) };
  const logger = { error: jest.fn() };
  const catalog = new DbCachedCatalog(inner, { store, prices, ttlMs: ONE_DAY, logger, now: () => NOW });
  return { inner, store, prices, logger, catalog };
}

describe('DbCachedCatalog grava o cache com o id resolvido', () => {
  test.each([
    ['BASE1-4', 'en'],
    ['base1-4', 'fr'],
  ])('pedido %s (%s) grava CardCache e preço com base1-4', async (id, lang) => {
    const { catalog, store, prices } = setup();

    const card = await catalog.getById(id, lang);

    expect(card.id).toBe('base1-4');
    expect(store.read).toHaveBeenCalledWith(id, lang);
    expect(store.write).toHaveBeenCalledTimes(1);
    expect(store.write).toHaveBeenCalledWith('base1-4', lang, card);
    expect(prices.refreshPrice).toHaveBeenCalledTimes(1);
    expect(prices.refreshPrice).toHaveBeenCalledWith('base1-4', card.marketPrice);
  });
});

describe('DbCachedCatalog', () => {
  test('dado fresco no banco não chama a TCGdex', async () => {
    const data = detail('base1-4');
    const { catalog, inner, store, prices } = setup({ data, updatedAt: new Date(NOW - ONE_DAY + 1000) });

    await expect(catalog.getById('base1-4', 'en')).resolves.toBe(data);
    expect(inner.getById).not.toHaveBeenCalled();
    expect(store.write).not.toHaveBeenCalled();
    expect(prices.refreshPrice).not.toHaveBeenCalled();
    expect(catalog.isStale(data)).toBe(false);
  });

  test('dado vencido no banco busca de novo na TCGdex', async () => {
    const { catalog, inner, store } = setup({ data: detail('base1-4', 'Velho'), updatedAt: new Date(NOW - ONE_DAY) });

    const card = await catalog.getById('base1-4', 'en');

    expect(card.name).toBe('Charizard en');
    expect(inner.getById).toHaveBeenCalledTimes(1);
    expect(store.write).toHaveBeenCalledTimes(1);
  });

  test('TCGdex fora do ar com dado vencido no banco devolve o vencido', async () => {
    const data = detail('base1-4', 'Guardado');
    const { catalog, inner, store, prices } = setup({ data, updatedAt: new Date(NOW - 3 * ONE_DAY) });
    inner.getById.mockRejectedValue(new TcgdexUnavailableError('TCGdex respondeu 503'));

    await expect(catalog.getById('base1-4', 'en')).resolves.toBe(data);
    expect(catalog.isStale(data)).toBe(true);
    expect(store.write).not.toHaveBeenCalled();
    expect(prices.refreshPrice).not.toHaveBeenCalled();
  });

  test('TCGdex fora do ar sem nada no banco repassa o erro', async () => {
    const { catalog, inner } = setup();
    inner.getById.mockRejectedValue(new TcgdexUnavailableError('fora'));

    await expect(catalog.getById('base1-4', 'en')).rejects.toBeInstanceOf(TcgdexUnavailableError);
  });

  test('carta inexistente sem nada no banco repassa o CardNotFoundError', async () => {
    const { catalog, inner } = setup();
    inner.getById.mockRejectedValue(new CardNotFoundError('Carta x não encontrada'));

    await expect(catalog.getById('x', 'en')).rejects.toBeInstanceOf(CardNotFoundError);
  });

  test('falha ao ler, gravar o cache ou o preço não derruba a busca', async () => {
    const { catalog, store, prices, logger } = setup();
    store.read.mockRejectedValue(new Error('banco caiu'));
    store.write.mockRejectedValue(new Error('banco caiu'));
    prices.refreshPrice.mockRejectedValue(new Error('banco caiu'));

    const card = await catalog.getById('base1-4', 'en');

    expect(card.id).toBe('base1-4');
    expect(logger.error).toHaveBeenCalledWith('Falha ao ler CardCache:', 'banco caiu');
    expect(logger.error).toHaveBeenCalledWith('Falha ao salvar CardCache:', 'banco caiu');
    expect(logger.error).toHaveBeenCalledWith('Falha ao atualizar preço da Card:', 'banco caiu');
  });

  test('busca, sets e cartas do set passam direto para o de dentro', async () => {
    const { catalog, inner } = setup();

    await catalog.search({ lang: 'en', name: 'pikachu', page: 1, limit: 20 });
    await catalog.listSets('en');
    await catalog.listSetCards('base1', 'en');

    expect(inner.search).toHaveBeenCalledWith({ lang: 'en', name: 'pikachu', page: 1, limit: 20 });
    expect(inner.listSets).toHaveBeenCalledWith('en');
    expect(inner.listSetCards).toHaveBeenCalledWith('base1', 'en');
  });
});
