import { jest } from '@jest/globals';

import type { CardCatalog } from './CardCatalog.js';
import { LocalFirstCatalog, type LocalCatalogReader } from './LocalFirstCatalog.js';

const fromTcgdex = { types: ['Fire'], rarities: ['Rare'], categories: ['Pokemon'] };

let inner: jest.Mocked<CardCatalog>;
let store: jest.Mocked<LocalCatalogReader>;
let catalog: LocalFirstCatalog;

beforeEach(() => {
  inner = {
    getById: jest.fn<CardCatalog['getById']>(),
    search: jest.fn<CardCatalog['search']>(async () => []),
    listSets: jest.fn<CardCatalog['listSets']>(async () => [
      { id: 'base1', name: 'Base Set', logo: 'logo', symbol: null, cardCount: null },
    ]),
    listSetCards: jest.fn<CardCatalog['listSetCards']>(async () => []),
    listFilterValues: jest.fn<CardCatalog['listFilterValues']>(async () => fromTcgdex),
  };
  store = {
    listSets: jest.fn<LocalCatalogReader['listSets']>(async () => []),
    filterValues: jest.fn<LocalCatalogReader['filterValues']>(async () => null),
  };
  catalog = new LocalFirstCatalog(inner, store);
});

describe('LocalFirstCatalog', () => {
  test('valores de filtro sincronizados saem do banco, sem chamar a TCGdex', async () => {
    const local = { types: ['Fogo'], rarities: ['Rara'], categories: ['Pokémon'] };
    store.filterValues.mockResolvedValue(local);

    expect(await catalog.listFilterValues('pt')).toEqual(local);
    expect(store.filterValues).toHaveBeenCalledWith('pt');
    expect(inner.listFilterValues).not.toHaveBeenCalled();
  });

  test('banco sem valores de filtro: pede à TCGdex', async () => {
    expect(await catalog.listFilterValues('es')).toEqual(fromTcgdex);
    expect(inner.listFilterValues).toHaveBeenCalledWith('es');
  });

  test('sets do banco, na ordem guardada, sem chamar a TCGdex', async () => {
    store.listSets.mockResolvedValue([
      { id: 'base1', name: 'Base Set' },
      { id: 'sv03', name: 'Obsidian Flames' },
    ]);

    expect(await catalog.listSets('en')).toEqual([
      { id: 'base1', name: 'Base Set', logo: null, symbol: null, cardCount: null },
      { id: 'sv03', name: 'Obsidian Flames', logo: null, symbol: null, cardCount: null },
    ]);
    expect(inner.listSets).not.toHaveBeenCalled();
  });

  test('banco sem sets: pede à TCGdex', async () => {
    expect(await catalog.listSets('es')).toHaveLength(1);
    expect(inner.listSets).toHaveBeenCalledWith('es');
  });

  test('detalhe, busca e cartas do set seguem para o catálogo de dentro', async () => {
    const query = { lang: 'en', page: 1, limit: 10 };
    await catalog.search(query);
    await catalog.listSetCards('base1', 'en');

    expect(inner.search).toHaveBeenCalledWith(query);
    expect(inner.listSetCards).toHaveBeenCalledWith('base1', 'en');
  });
});
