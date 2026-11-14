import { jest } from '@jest/globals';

import { TcgdexUnavailableError } from '../../errors/TcgdexUnavailableError.js';
import type { CardCatalog } from '../catalog/CardCatalog.js';
import type { CardSummary, SetSummary } from '../types.js';
import { SmartCardFinder } from './SmartCardFinder.js';

const brief = (id: string, name: string): CardSummary => ({
  id,
  localId: id.split('-').pop() ?? id,
  name,
  image: { small: `https://img/${id}/low.webp`, large: `https://img/${id}/high.webp` },
});

const set = (id: string, name: string): SetSummary => ({ id, name, logo: null, symbol: null, cardCount: null });

const sets = [
  set('base1', 'Base Set'),
  set('base4', 'Base Set 2'),
  set('sv03.5', '151'),
  set('sv03', 'Obsidian Flames'),
  set('det1', 'Detective Pikachu'),
];

const setCards: Record<string, CardSummary[]> = {
  base1: [brief('base1-1', 'Alakazam'), brief('base1-4', 'Charizard'), brief('base1-58', 'Pikachu')],
  base4: [brief('base4-4', 'Charizard'), brief('base4-87', 'Pikachu')],
  det1: [brief('det1-10', 'Detective Pikachu'), brief('det1-5', 'Charizard GX')],
};

const allCards = [
  brief('sv03-125', 'Charizard ex'),
  brief('sv03.5-6', 'Charizard ex'),
  brief('base4-4', 'Charizard'),
  brief('base1-4', 'Charizard'),
  brief('base1-58', 'Pikachu'),
  brief('det1-10', 'Detective Pikachu'),
  brief('swsh1-65', 'Pikachu'),
];

let langSeq = 0;
const freshLang = () => `l${++langSeq}`;

let catalog: jest.Mocked<CardCatalog>;
let finder: SmartCardFinder;

beforeEach(() => {
  catalog = {
    getById: jest.fn<CardCatalog['getById']>(),
    search: jest.fn<CardCatalog['search']>(async ({ name }) =>
      allCards.filter((card) => card.name.toLowerCase().includes(name ?? '')),
    ),
    listSets: jest.fn<CardCatalog['listSets']>(async () => sets),
    listSetCards: jest.fn<CardCatalog['listSetCards']>(async (setId) => setCards[setId] ?? []),
  };
  finder = new SmartCardFinder(catalog, { ttlMs: 10 * 60 * 1000 });
});

describe('SmartCardFinder.find', () => {
  test('charizard traz os Charizard com set e number', async () => {
    const result = await finder.find({ lang: freshLang(), name: 'charizard', page: 1, limit: 20 });

    expect(result.cards.map((card) => card.id)).toEqual(['base4-4', 'base1-4', 'sv03-125', 'sv03.5-6']);
    expect(result.cards[3]).toEqual({
      id: 'sv03.5-6',
      localId: '6',
      number: '6',
      name: 'Charizard ex',
      set: { id: 'sv03.5', name: '151' },
      image: { small: 'https://img/sv03.5-6/low.webp', large: 'https://img/sv03.5-6/high.webp' },
    });
    expect(result.search).toEqual({ name: 'charizard', sets: [], ignored: [] });
    expect(result.hasNextPage).toBe(false);
    expect(catalog.search).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'charizard', page: 1, limit: 250 }),
    );
  });

  test('charizard base traz o Charizard do Base Set primeiro', async () => {
    const result = await finder.find({ lang: freshLang(), name: 'charizard base', page: 1, limit: 20 });

    expect(result.cards[0].id).toBe('base1-4');
    expect(result.cards[0].set).toEqual({ id: 'base1', name: 'Base Set' });
    expect(result.cards.map((card) => card.id)).not.toContain('base1-58');
    expect(result.search).toEqual({ name: 'charizard', sets: ['Base Set', 'Base Set 2'], ignored: [] });
    expect(catalog.listSetCards).toHaveBeenCalledTimes(2);
  });

  test('charizard base x pipi popo traz os Charizard e ignora o lixo', async () => {
    const result = await finder.find({ lang: freshLang(), name: 'charizard base x pipi popo', page: 1, limit: 20 });

    expect(result.cards[0].id).toBe('base1-4');
    expect(result.cards.every((card) => card.name.startsWith('Charizard'))).toBe(true);
    expect(result.cards).toHaveLength(4);
    expect(result.search).toEqual({ name: 'charizard', sets: ['Base Set', 'Base Set 2'], ignored: ['pipi', 'popo'] });
    expect(catalog.search).toHaveBeenCalledTimes(4);
  });

  test('base set traz as cartas do Base Set', async () => {
    const result = await finder.find({ lang: freshLang(), name: 'base set', page: 1, limit: 20 });

    expect(result.cards.slice(0, 3).map((card) => card.id)).toEqual(['base1-1', 'base1-4', 'base1-58']);
    expect(result.search).toEqual({ name: null, sets: ['Base Set', 'Base Set 2'], ignored: [] });
    expect(catalog.search).not.toHaveBeenCalled();
  });

  test('pikachu não vira só o set Detective Pikachu', async () => {
    const result = await finder.find({ lang: freshLang(), name: 'pikachu', page: 1, limit: 20 });

    expect(result.cards.map((card) => card.id)).toEqual(['det1-10', 'base1-58', 'swsh1-65']);
    expect(result.search).toEqual({ name: 'pikachu', sets: ['Detective Pikachu'], ignored: [] });
  });

  test('pikachu 25 ainda traz os Pikachu e ignora o 25', async () => {
    const result = await finder.find({ lang: freshLang(), name: 'pikachu 25', page: 1, limit: 20 });

    expect(result.cards.map((card) => card.id)).toEqual(['det1-10', 'base1-58', 'swsh1-65']);
    expect(result.search).toEqual({ name: 'pikachu', sets: ['Detective Pikachu'], ignored: ['25'] });
  });

  test('xyzxyz devolve lista vazia', async () => {
    const result = await finder.find({ lang: freshLang(), name: 'xyzxyz', page: 1, limit: 20 });

    expect(result).toEqual({
      cards: [],
      hasNextPage: false,
      search: { name: null, sets: [], ignored: ['xyzxyz'] },
    });
  });

  test('TCGdex fora do ar repassa o erro', async () => {
    catalog.search.mockRejectedValue(new TcgdexUnavailableError('fora'));

    await expect(finder.find({ lang: freshLang(), name: 'charizard', page: 1, limit: 20 })).rejects.toBeInstanceOf(
      TcgdexUnavailableError,
    );
  });

  test('página 2 da mesma busca sai do cache e pagina a lista ranqueada', async () => {
    const lang = freshLang();
    const first = await finder.find({ lang, name: 'Charizard', page: 1, limit: 3 });
    const second = await finder.find({ lang, name: 'charizard ', page: 2, limit: 3 });

    expect(first.cards).toHaveLength(3);
    expect(first.hasNextPage).toBe(true);
    expect(second.cards.map((card) => card.id)).toEqual(['sv03.5-6']);
    expect(second.hasNextPage).toBe(false);
    expect(catalog.search).toHaveBeenCalledTimes(1);
    expect(catalog.listSets).toHaveBeenCalledTimes(1);
  });

  test('sem nome mantém a lista paginada da TCGdex', async () => {
    catalog.search.mockResolvedValue([brief('base1-4', 'Charizard'), brief('base1-58', 'Pikachu')]);

    const result = await finder.find({ lang: freshLang(), page: 3, limit: 2 });

    expect(catalog.search).toHaveBeenCalledWith(expect.objectContaining({ page: 3, limit: 2 }));
    expect(result.hasNextPage).toBe(true);
    expect(result.search).toBeNull();
    expect(result.cards[0]).toMatchObject({ number: '4', set: { id: 'base1', name: 'Base Set' } });
  });

  test('busca que imita a chave da lista não apaga a lista sem nome', async () => {
    const lang = freshLang();
    await finder.find({ lang, name: ':1:20', page: 1, limit: 20 });
    catalog.search.mockResolvedValue([brief('base1-4', 'Charizard')]);

    const result = await finder.find({ lang, page: 1, limit: 20 });

    expect(result.cards.map((card) => card.id)).toEqual(['base1-4']);
    expect(result.hasNextPage).toBe(false);
  });
});

describe('SmartCardFinder cache', () => {
  test('cada instância tem a sua memória', async () => {
    const other = new SmartCardFinder(catalog, { ttlMs: 10 * 60 * 1000 });

    await finder.find({ lang: 'en', name: 'charizard', page: 1, limit: 20 });
    await other.find({ lang: 'en', name: 'charizard', page: 1, limit: 20 });

    expect(catalog.search).toHaveBeenCalledTimes(2);
  });

  test('lista sem nome guarda cada página separada', async () => {
    await finder.find({ lang: 'en', page: 1, limit: 20 });
    await finder.find({ lang: 'en', page: 1, limit: 20 });
    await finder.find({ lang: 'en', page: 2, limit: 20 });

    expect(catalog.search).toHaveBeenCalledTimes(2);
  });
});
