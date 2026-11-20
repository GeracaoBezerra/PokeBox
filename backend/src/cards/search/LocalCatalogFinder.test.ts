import { jest } from '@jest/globals';

import type { CardListQuery, CardListResult } from '../types.js';
import type { CardFinder } from './CardFinder.js';
import type { CatalogEntry, CatalogSearchStore, CatalogSet } from './CatalogSearchStore.js';
import { LocalCatalogFinder } from './LocalCatalogFinder.js';

const entry = (id: string, name: string, setId: string, setName: string): CatalogEntry => ({
  id,
  localId: id.split('-').pop() ?? id,
  name,
  setId,
  setName,
  imageUrl: `https://img/${id}/low.webp`,
});

const sets: CatalogSet[] = [
  { id: 'base1', name: 'Base Set' },
  { id: 'base4', name: 'Base Set 2' },
  { id: 'det1', name: 'Detective Pikachu' },
  { id: 'sv03', name: 'Obsidian Flames' },
];

const fromFallback: CardListResult = { cards: [], hasNextPage: false, search: null };

let store: jest.Mocked<CatalogSearchStore>;
let fallback: jest.Mocked<CardFinder>;
let finder: LocalCatalogFinder;

const query = (overrides: Partial<CardListQuery> = {}): CardListQuery => ({
  lang: 'en',
  name: 'charizard',
  page: 1,
  limit: 2,
  ...overrides,
});

beforeEach(() => {
  store = {
    listSets: jest.fn<CatalogSearchStore['listSets']>(async () => sets),
    filterValues: jest.fn<CatalogSearchStore['filterValues']>(async () => null),
    matchingWords: jest.fn<CatalogSearchStore['matchingWords']>(async (_lang, words) =>
      words.filter((word) => ['charizard', 'charzard', 'pikachu', 'detective'].includes(word)),
    ),
    search: jest.fn<CatalogSearchStore['search']>(async () => [
      entry('base1-4', 'Charizard', 'base1', 'Base Set'),
      entry('sv03-125', 'Charizard ex', 'sv03', 'Obsidian Flames'),
      entry('base4-4', 'Charizard', 'base4', 'Base Set 2'),
    ]),
  };
  fallback = { find: jest.fn<CardFinder['find']>(async () => fromFallback) };
  finder = new LocalCatalogFinder(store, fallback, { setsTtlMs: 60_000 });
});

describe('LocalCatalogFinder.find', () => {
  test('com o catálogo local preenchido, busca no banco e monta a carta com set, number e imagens', async () => {
    const result = await finder.find(query({ name: 'charzard' }));

    expect(fallback.find).not.toHaveBeenCalled();
    expect(store.search).toHaveBeenCalledWith({
      lang: 'en',
      words: ['charzard'],
      phrase: 'charzard',
      setIds: [],
      onlySetId: undefined,
      offset: 0,
      take: 3,
      sort: undefined,
    });
    expect(result.hasNextPage).toBe(true);
    expect(result.cards).toHaveLength(2);
    expect(result.cards[0]).toEqual({
      id: 'base1-4',
      localId: '4',
      number: '4',
      name: 'Charizard',
      set: { id: 'base1', name: 'Base Set' },
      image: { small: 'https://img/base1-4/low.webp', large: 'https://img/base1-4/high.webp' },
    });
    expect(result.search).toEqual({ name: 'charzard', sets: [], ignored: [] });
  });

  test('a página vira offset e a última página não tem próxima', async () => {
    store.search.mockResolvedValueOnce([entry('base4-4', 'Charizard', 'base4', 'Base Set 2')]);

    const result = await finder.find(query({ page: 3 }));

    expect(store.search).toHaveBeenCalledWith(expect.objectContaining({ offset: 4, take: 3 }));
    expect(result.hasNextPage).toBe(false);
    expect(result.cards.map((card) => card.id)).toEqual(['base4-4']);
  });

  test('catálogo local vazio para o idioma: usa a busca da TCGdex', async () => {
    store.listSets.mockResolvedValue([]);

    const result = await finder.find(query({ lang: 'pt' }));

    expect(result).toBe(fromFallback);
    expect(fallback.find).toHaveBeenCalledWith(query({ lang: 'pt' }));
    expect(store.search).not.toHaveBeenCalled();
  });

  test('catálogo vazio não fica guardado: depois do sync a busca local passa a valer', async () => {
    store.listSets.mockResolvedValueOnce([]);

    await finder.find(query());
    await finder.find(query());

    expect(store.listSets).toHaveBeenCalledTimes(2);
    expect(fallback.find).toHaveBeenCalledTimes(1);
    expect(store.search).toHaveBeenCalledTimes(1);
  });

  test('a lista de sets fica em memória entre as buscas', async () => {
    await finder.find(query());
    await finder.find(query({ name: 'pikachu' }));

    expect(store.listSets).toHaveBeenCalledTimes(1);
  });

  test('set reconhecido: manda os sets para o ranking e explica a busca', async () => {
    const result = await finder.find(query({ name: 'charizard base' }));

    expect(store.matchingWords).toHaveBeenCalledWith('en', ['charizard']);
    expect(store.search).toHaveBeenCalledWith(
      expect.objectContaining({ words: ['charizard'], phrase: 'charizard base', setIds: ['base1', 'base4'] }),
    );
    expect(result.search).toEqual({ name: 'charizard', sets: ['Base Set', 'Base Set 2'], ignored: [] });
  });

  test('palavras que não acham nada vão para ignored', async () => {
    const result = await finder.find(query({ name: 'charizard pipi popo' }));

    expect(store.search).toHaveBeenCalledWith(expect.objectContaining({ words: ['charizard'] }));
    expect(result.search).toEqual({ name: 'charizard', sets: [], ignored: ['pipi', 'popo'] });
  });

  test('só o nome do set: lista as cartas do set', async () => {
    await finder.find(query({ name: 'obsidian flames' }));

    expect(store.search).toHaveBeenCalledWith(expect.objectContaining({ words: [], setIds: ['sv03'] }));
  });

  test('nome que é parte de um set e não acha carta sozinho: tenta a palavra do set como nome', async () => {
    store.matchingWords.mockResolvedValueOnce([]);

    const result = await finder.find(query({ name: 'xyz detective' }));

    expect(store.matchingWords).toHaveBeenNthCalledWith(1, 'en', ['xyz']);
    expect(store.matchingWords).toHaveBeenNthCalledWith(2, 'en', ['detective']);
    expect(result.search).toEqual({ name: 'detective', sets: ['Detective Pikachu'], ignored: ['xyz'] });
  });

  test('nada encontrado e nenhum set: lista vazia sem ir ao banco buscar cartas', async () => {
    const result = await finder.find(query({ name: 'pipi popo' }));

    expect(store.search).not.toHaveBeenCalled();
    expect(result).toEqual({ cards: [], hasNextPage: false, search: { name: null, sets: [], ignored: ['pipi', 'popo'] } });
  });

  test('filtro de set: restringe ao set e ignora os outros sets reconhecidos', async () => {
    await finder.find(query({ name: 'charizard base', filters: { set: 'base4' } }));

    expect(store.search).toHaveBeenCalledWith(expect.objectContaining({ setIds: ['base4'], onlySetId: 'base4' }));
  });

  test('ordenação por nome segue para o banco', async () => {
    await finder.find(query({ sort: { field: 'name', order: 'desc' } }));

    expect(store.search).toHaveBeenCalledWith(expect.objectContaining({ sort: { field: 'name', order: 'desc' } }));
  });

  test('mantém os contadores calculados pelo ranking no item da lista', async () => {
    store.search.mockResolvedValueOnce([
      { ...entry('base1-4', 'Charizard', 'base1', 'Base Set'), wishlistCount: 12, tradeCount: 7 },
    ]);

    const result = await finder.find(query({ sort: { field: 'wanted', order: 'desc' } }));

    expect(result.cards[0]).toMatchObject({ id: 'base1-4', wishlistCount: 12, tradeCount: 7 });
  });

  test.each([
    ['filtro de tipo', query({ filters: { type: 'Fire' } })],
    ['filtro de raridade', query({ filters: { rarity: 'Rare' } })],
    ['filtro de categoria', query({ filters: { category: 'Pokemon' } })],
  ])('%s antes do sync dos filtros: usa a busca da TCGdex', async (_, input) => {
    const result = await finder.find(input);

    expect(result).toBe(fromFallback);
    expect(store.listSets).not.toHaveBeenCalled();
  });

  test('filtros sincronizados: tipo, raridade e categoria vão para o banco', async () => {
    store.filterValues.mockResolvedValue({ types: ['Fire'], rarities: ['Rare'], categories: ['Pokemon'] });

    await finder.find(query({ filters: { type: 'Fire', rarity: 'Rare', category: 'Pokemon' } }));
    await finder.find(query({ filters: { type: 'Fire' } }));

    expect(fallback.find).not.toHaveBeenCalled();
    expect(store.search).toHaveBeenCalledWith(
      expect.objectContaining({ attributes: { type: 'Fire', rarity: 'Rare', category: 'Pokemon' } }),
    );
    expect(store.filterValues).toHaveBeenCalledTimes(1);
  });

  test.each([
    ['sem nome', query({ name: undefined })],
    ['nome só com letras soltas', query({ name: 'a' })],
  ])('%s: lista o catálogo local sem explicar a busca', async (_, input) => {
    const result = await finder.find(input);

    expect(fallback.find).not.toHaveBeenCalled();
    expect(store.search).toHaveBeenCalledWith({
      lang: 'en',
      words: [],
      phrase: '',
      setIds: [],
      onlySetId: undefined,
      attributes: undefined,
      offset: 0,
      take: 3,
      sort: undefined,
    });
    expect(result).toMatchObject({ hasNextPage: true, search: null });
    expect(result.cards).toHaveLength(2);
  });

  test('sem nome com set e tipo: lista só o que bate', async () => {
    store.filterValues.mockResolvedValue({ types: ['Fire'], rarities: [], categories: [] });

    await finder.find(query({ name: undefined, page: 2, filters: { set: 'base1', type: 'Fire' } }));

    expect(store.search).toHaveBeenCalledWith(
      expect.objectContaining({ onlySetId: 'base1', attributes: { type: 'Fire' }, offset: 2 }),
    );
  });

  test('sem nome e catálogo local vazio: usa a busca da TCGdex', async () => {
    store.listSets.mockResolvedValue([]);

    const result = await finder.find(query({ name: undefined }));

    expect(result).toBe(fromFallback);
  });

  test('imagem ausente vira null nas duas URLs', async () => {
    store.search.mockResolvedValueOnce([{ ...entry('base1-4', 'Charizard', 'base1', 'Base Set'), imageUrl: null }]);

    const result = await finder.find(query());

    expect(result.cards[0].image).toEqual({ small: null, large: null });
  });
});
