import { jest } from '@jest/globals';

import { cardMock } from '../../mocks/cardMock.js';
import type { CardDetail } from '../types.js';
import type { CardCacheStore } from './CardCacheStore.js';
import type { CardCatalog } from './CardCatalog.js';
import { DbCachedCatalog } from './DbCachedCatalog.js';
import { InFlightDedupCatalog } from './InFlightDedupCatalog.js';
import { MemoryCachedCatalog } from './MemoryCachedCatalog.js';

const ONE_HOUR = 60 * 60 * 1000;

function fakeCatalog(): jest.Mocked<CardCatalog> {
  return {
    getById: jest.fn<CardCatalog['getById']>(async () => ({ ...cardMock, id: 'base1-4' })),
    search: jest.fn<CardCatalog['search']>(async () => []),
    listSets: jest.fn<CardCatalog['listSets']>(async () => []),
    listSetCards: jest.fn<CardCatalog['listSetCards']>(async () => []),
  };
}

describe('MemoryCachedCatalog', () => {
  test('depois de BASE1-4, o id pedido e o resolvido saem da memória', async () => {
    const inner = fakeCatalog();
    const store: jest.Mocked<CardCacheStore> = {
      read: jest.fn<CardCacheStore['read']>(async () => null),
      write: jest.fn<CardCacheStore['write']>(async () => {}),
    };
    const prices = { refreshPrice: jest.fn(async () => {}) };
    const catalog = new MemoryCachedCatalog(
      new InFlightDedupCatalog(new DbCachedCatalog(inner, { store, prices, ttlMs: 24 * ONE_HOUR })),
      { detailTtlMs: ONE_HOUR },
    );

    await catalog.getById('BASE1-4', 'de');
    await catalog.getById('BASE1-4', 'de');
    await catalog.getById('base1-4', 'de');

    expect(inner.getById).toHaveBeenCalledTimes(1);
    expect(store.read).toHaveBeenCalledTimes(1);
  });

  test('idiomas diferentes não dividem a memória', async () => {
    const inner = fakeCatalog();
    const catalog = new MemoryCachedCatalog(inner, { detailTtlMs: ONE_HOUR });

    await catalog.getById('base1-4', 'en');
    await catalog.getById('base1-4', 'pt');

    expect(inner.getById).toHaveBeenCalledTimes(2);
  });

  test('carta que não pode ir para a memória é buscada de novo', async () => {
    const inner = fakeCatalog();
    const catalog = new MemoryCachedCatalog(inner, {
      detailTtlMs: ONE_HOUR,
      isCacheable: (card: CardDetail) => card.id !== 'base1-4',
    });

    await catalog.getById('base1-4', 'en');
    await catalog.getById('base1-4', 'en');

    expect(inner.getById).toHaveBeenCalledTimes(2);
  });

  test('memória vencida busca de novo', async () => {
    const inner = fakeCatalog();
    const catalog = new MemoryCachedCatalog(inner, { detailTtlMs: ONE_HOUR });
    const now = jest.spyOn(Date, 'now');

    now.mockReturnValue(1_000);
    await catalog.getById('base1-4', 'en');
    now.mockReturnValue(1_000 + ONE_HOUR + 1);
    await catalog.getById('base1-4', 'en');
    now.mockRestore();

    expect(inner.getById).toHaveBeenCalledTimes(2);
  });

  test('busca e sets não passam pela memória do detalhe', async () => {
    const inner = fakeCatalog();
    const catalog = new MemoryCachedCatalog(inner, { detailTtlMs: ONE_HOUR });
    const query = { lang: 'en', name: 'pikachu', page: 1, limit: 20 };

    await catalog.search(query);
    await catalog.search(query);
    await catalog.listSets('en');
    await catalog.listSetCards('base1', 'en');

    expect(inner.search).toHaveBeenCalledTimes(2);
    expect(inner.listSets).toHaveBeenCalledWith('en');
    expect(inner.listSetCards).toHaveBeenCalledWith('base1', 'en');
  });
});
