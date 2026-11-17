import { jest } from '@jest/globals';

import { CardNotFoundError } from '../../errors/CardNotFoundError.js';
import { TcgdexUnavailableError } from '../../errors/TcgdexUnavailableError.js';
import { TcgdexClient, type FetchFn } from './TcgdexClient.js';

const jsonResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const abortError = () => Object.assign(new Error('This operation was aborted'), { name: 'AbortError' });

const tcgdexCard = {
  id: 'base1-4',
  localId: '4',
  name: 'Charizard',
  image: 'https://img/base1/4',
  category: 'Pokemon',
  set: { id: 'base1', name: 'Base Set', logo: 'https://img/base1/logo', cardCount: { official: 102, total: 102 } },
  variants: { holo: true },
  hp: 120,
  attacks: [{ name: 'Fire Spin', cost: ['Fire'], damage: 100 }],
  pricing: { tcgplayer: { unit: 'USD', updated: '2026-11-01', holofoil: { marketPrice: 390 } } },
};

describe('TcgdexClient', () => {
  let fetchMock: jest.Mock<FetchFn>;
  let logger: Record<'info' | 'warn' | 'error', jest.Mock<(fields: object, message: string) => void>>;
  let client: TcgdexClient;

  beforeEach(() => {
    fetchMock = jest.fn<FetchFn>();
    logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() };
    client = new TcgdexClient({
      baseUrl: 'https://tcgdex.test/v2',
      timeoutMs: 8000,
      fetch: fetchMock,
      logger,
      retryDelaysMs: [0, 0],
    });
  });

  it('TCGdex respondendo 503 lança TcgdexUnavailableError sem timeout', async () => {
    fetchMock.mockResolvedValue(jsonResponse(503, { error: 'down' }));

    const err = await client.getById('base1-4', 'en').catch((e: unknown) => e);

    expect(err).toBeInstanceOf(TcgdexUnavailableError);
    expect((err as TcgdexUnavailableError).timeout).toBe(false);
  });

  it('sem conexão (fetch failed) lança TcgdexUnavailableError', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));

    const err = await client.search({ lang: 'en', name: 'pikachu', page: 1, limit: 20 }).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(TcgdexUnavailableError);
    expect((err as TcgdexUnavailableError).timeout).toBe(false);
    expect((err as TcgdexUnavailableError).cause).toBeInstanceOf(TypeError);
  });

  it('timeout (AbortError) lança TcgdexUnavailableError com timeout', async () => {
    fetchMock.mockRejectedValue(abortError());

    const err = await client.getById('base1-4', 'en').catch((e: unknown) => e);

    expect(err).toBeInstanceOf(TcgdexUnavailableError);
    expect((err as TcgdexUnavailableError).timeout).toBe(true);
  });

  it('404 no detalhe lança CardNotFoundError', async () => {
    fetchMock.mockResolvedValue(jsonResponse(404, { error: 'not found' }));

    await expect(client.getById('nao-existe-999', 'en')).rejects.toBeInstanceOf(CardNotFoundError);
  });

  it('404 na busca devolve lista vazia', async () => {
    fetchMock.mockResolvedValue(jsonResponse(404, { error: 'not found' }));

    await expect(client.search({ lang: 'en', name: 'zzz', page: 1, limit: 20 })).resolves.toEqual([]);
  });

  it('200 com JSON fora do formato lança TcgdexUnavailableError', async () => {
    fetchMock.mockImplementation(async () => jsonResponse(200, { foo: 'bar' }));

    await expect(client.getById('base1-4', 'en')).rejects.toBeInstanceOf(TcgdexUnavailableError);
    await expect(client.search({ lang: 'en', name: 'pikachu', page: 1, limit: 20 })).rejects.toBeInstanceOf(
      TcgdexUnavailableError,
    );
  });

  it('200 com corpo que não é JSON lança TcgdexUnavailableError', async () => {
    fetchMock.mockResolvedValue(new Response('<html>erro</html>', { status: 200 }));

    await expect(client.search({ lang: 'en', name: 'pikachu', page: 1, limit: 20 })).rejects.toBeInstanceOf(
      TcgdexUnavailableError,
    );
  });

  it('busca com resposta válida devolve o resumo das cartas', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, [{ id: 'base1-58', localId: '58', name: 'Pikachu', image: 'https://img/base1/58' }]),
    );

    await expect(client.search({ lang: 'en', name: 'pikachu', page: 1, limit: 20 })).resolves.toEqual([
      {
        id: 'base1-58',
        localId: '58',
        name: 'Pikachu',
        image: { small: 'https://img/base1/58/low.webp', large: 'https://img/base1/58/high.webp' },
      },
    ]);
  });

  it('busca monta a URL com idioma, paginação e nome', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, []));

    await client.search({ lang: 'fr', name: 'pikachu', page: 2, limit: 50 });

    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://tcgdex.test/v2/fr/cards?pagination%3Apage=2&pagination%3AitemsPerPage=50&name=pikachu',
    );
  });

  it('detalhe junta a carta com a série e a data do set', async () => {
    fetchMock.mockImplementation(async (url) =>
      url.endsWith('/sets/base1')
        ? jsonResponse(200, { id: 'base1', name: 'Base Set', serie: { id: 'base', name: 'Base' }, releaseDate: '1999-01-09' })
        : jsonResponse(200, tcgdexCard),
    );

    const card = await client.getById('base1-4', 'en');

    expect(card).toMatchObject({
      id: 'base1-4',
      number: '4/102',
      image: { small: 'https://img/base1/4/low.webp', large: 'https://img/base1/4/high.webp' },
      set: { id: 'base1', logo: 'https://img/base1/logo.webp', symbol: null, series: 'Base', releaseDate: '1999-01-09' },
      attacks: [{ name: 'Fire Spin', cost: ['Fire'], damage: '100', effect: null }],
      variants: { normal: false, reverse: false, holo: true, firstEdition: false },
      marketPrice: { source: 'tcgplayer', value: 390, currency: 'USD', updatedAt: '2026-11-01' },
    });
  });

  it('detalhe com o set fora do ar devolve série e data nulas', async () => {
    fetchMock.mockImplementation(async (url) =>
      url.endsWith('/sets/base1') ? jsonResponse(503, { error: 'down' }) : jsonResponse(200, tcgdexCard),
    );

    const card = await client.getById('base1-4', 'en');

    expect(card.set).toMatchObject({ series: null, releaseDate: null });
    expect(logger.warn).toHaveBeenCalledWith(
      { err: 'TCGdex respondeu 503', setId: 'base1', lang: 'en' },
      'falha ao buscar o set na TCGdex',
    );
  });

  it('listSets devolve os sets e guarda em memória', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, [
        { id: 'base1', name: 'Base Set', logo: 'https://img/base1/logo', cardCount: { total: 102, official: 102 } },
        { id: 'miscp', name: 'Miscellaneous Promos' },
      ]),
    );

    const first = await client.listSets('fr');
    const second = await client.listSets('fr');

    expect(first).toEqual([
      { id: 'base1', name: 'Base Set', logo: 'https://img/base1/logo', symbol: null, cardCount: { total: 102, official: 102 } },
      { id: 'miscp', name: 'Miscellaneous Promos', logo: null, symbol: null, cardCount: null },
    ]);
    expect(second).toBe(first);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/fr\/sets$/);
  });

  it('listSets com a TCGdex fora do ar devolve lista vazia sem guardar', async () => {
    fetchMock.mockImplementationOnce(async () => jsonResponse(503, { error: 'down' }));
    fetchMock.mockImplementationOnce(async () => jsonResponse(503, { error: 'down' }));
    fetchMock.mockImplementationOnce(async () => jsonResponse(503, { error: 'down' }));
    fetchMock.mockResolvedValueOnce(jsonResponse(200, [{ id: 'base1', name: 'Base Set' }]));

    await expect(client.listSets('de')).resolves.toEqual([]);
    await expect(client.listSets('de')).resolves.toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it('listSetCards devolve o resumo das cartas do set e guarda em memória', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, {
        id: 'base1',
        name: 'Base Set',
        cards: [{ id: 'base1-4', localId: '4', name: 'Charizard', image: 'https://img/base1/4' }],
      }),
    );

    const cards = await client.listSetCards('base1', 'it');
    await client.listSetCards('base1', 'it');

    expect(cards).toEqual([
      {
        id: 'base1-4',
        localId: '4',
        name: 'Charizard',
        image: { small: 'https://img/base1/4/low.webp', large: 'https://img/base1/4/high.webp' },
      },
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('listSetCards com set inexistente devolve lista vazia', async () => {
    fetchMock.mockResolvedValue(jsonResponse(404, { error: 'not found' }));

    await expect(client.listSetCards('nao-existe', 'en')).resolves.toEqual([]);
  });

  it('cada instância tem o seu cache de sets', async () => {
    fetchMock.mockImplementation(async () => jsonResponse(200, [{ id: 'base1', name: 'Base Set' }]));
    const other = new TcgdexClient({ baseUrl: 'https://tcgdex.test/v2', timeoutMs: 8000, fetch: fetchMock, logger });

    await client.listSets('en');
    await other.listSets('en');

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('busca com filtros pede o valor exato (eq:) e repassa a ordenação', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, []));

    await client.search({
      lang: 'en',
      page: 1,
      limit: 20,
      filters: { type: 'Fire', rarity: 'Rare Holo', set: 'base1', category: 'Pokemon' },
      sort: { field: 'name', order: 'desc' },
    });

    const url = new URL(fetchMock.mock.calls[0][0]);
    expect(url.searchParams.get('types')).toBe('eq:Fire');
    expect(url.searchParams.get('rarity')).toBe('eq:Rare Holo');
    expect(url.searchParams.get('set.id')).toBe('eq:base1');
    expect(url.searchParams.get('category')).toBe('eq:Pokemon');
    expect(url.searchParams.get('sort:field')).toBe('name');
    expect(url.searchParams.get('sort:order')).toBe('DESC');
  });

  it('busca sem filtros não manda filtro nem ordenação', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, []));

    await client.search({ lang: 'en', page: 1, limit: 20, filters: { type: undefined } });

    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://tcgdex.test/v2/en/cards?pagination%3Apage=1&pagination%3AitemsPerPage=20',
    );
  });

  it('listFilterValues junta tipos, raridades e categorias e guarda por idioma', async () => {
    const lists: Record<string, string[]> = {
      '/pt/types': ['Fogo', 'Água'],
      '/pt/rarities': ['Comum', 'Rara'],
      '/pt/categories': ['Pokémon', 'Treinador'],
    };
    fetchMock.mockImplementation(async (url) => jsonResponse(200, lists[new URL(url).pathname.replace('/v2', '')]));

    const first = await client.listFilterValues('pt');
    const second = await client.listFilterValues('pt');

    expect(first).toEqual({ types: ['Fogo', 'Água'], rarities: ['Comum', 'Rara'], categories: ['Pokémon', 'Treinador'] });
    expect(second).toBe(first);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('listFilterValues com a TCGdex fora lança TcgdexUnavailableError e não guarda nada', async () => {
    fetchMock.mockResolvedValue(jsonResponse(503, { error: 'down' }));

    await expect(client.listFilterValues('en')).rejects.toBeInstanceOf(TcgdexUnavailableError);

    fetchMock.mockImplementation(async () => jsonResponse(200, ['Fire']));
    await expect(client.listFilterValues('en')).resolves.toEqual({ types: ['Fire'], rarities: ['Fire'], categories: ['Fire'] });
  });

  it('listFilterValues com uma lista faltando (404) não guarda nada', async () => {
    fetchMock.mockImplementation(async (url) =>
      url.endsWith('/types') ? jsonResponse(404, { error: 'not found' }) : jsonResponse(200, ['Rare']),
    );

    await expect(client.listFilterValues('en')).resolves.toEqual({ types: [], rarities: ['Rare'], categories: ['Rare'] });

    fetchMock.mockImplementation(async () => jsonResponse(200, ['Fire']));
    await expect(client.listFilterValues('en')).resolves.toEqual({ types: ['Fire'], rarities: ['Fire'], categories: ['Fire'] });
  });
  describe('nova tentativa (#145)', () => {
    const down = () => jsonResponse(503, { error: 'down' });

    it('503 uma vez e depois 200 responde normalmente', async () => {
      fetchMock.mockResolvedValueOnce(down());
      fetchMock.mockResolvedValueOnce(jsonResponse(200, [{ id: 'base1-4', localId: '4', name: 'Charizard' }]));

      const cards = await client.search({ lang: 'en', name: 'charizard', page: 1, limit: 20 });

      expect(cards.map((card) => card.id)).toEqual(['base1-4']);
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.objectContaining({ attempt: 1, path: expect.stringContaining('/en/cards?') }),
        'TCGdex falhou, tentando de novo',
      );
    });

    it('503 três vezes desiste depois de 3 chamadas', async () => {
      fetchMock.mockImplementation(async () => down());

      await expect(client.getById('base1-4', 'en')).rejects.toBeInstanceOf(TcgdexUnavailableError);
      expect(fetchMock).toHaveBeenCalledTimes(3);
    });

    it.each([502, 504])('%i também tenta de novo', async (status) => {
      fetchMock.mockResolvedValueOnce(jsonResponse(status, {}));
      fetchMock.mockResolvedValueOnce(jsonResponse(200, tcgdexCard));
      fetchMock.mockResolvedValueOnce(jsonResponse(200, { id: 'base1', name: 'Base Set' }));

      await expect(client.getById('base1-4', 'en')).resolves.toMatchObject({ id: 'base1-4' });
    });

    it('falha de conexão tenta de novo', async () => {
      fetchMock.mockRejectedValueOnce(new TypeError('fetch failed'));
      fetchMock.mockResolvedValueOnce(jsonResponse(200, []));

      await expect(client.search({ lang: 'en', name: 'x', page: 1, limit: 20 })).resolves.toEqual([]);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('404 não tenta de novo', async () => {
      fetchMock.mockImplementation(async () => jsonResponse(404, {}));

      await expect(client.getById('nao-existe-999', 'en')).rejects.toBeInstanceOf(CardNotFoundError);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it.each([400, 500])('%i não tenta de novo', async (status) => {
      fetchMock.mockImplementation(async () => jsonResponse(status, {}));

      await expect(client.search({ lang: 'en', name: 'x', page: 1, limit: 20 })).rejects.toBeInstanceOf(
        TcgdexUnavailableError,
      );
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('timeout não tenta de novo', async () => {
      fetchMock.mockRejectedValue(abortError());

      const err = await client.getById('base1-4', 'en').catch((e: unknown) => e);

      expect((err as TcgdexUnavailableError).timeout).toBe(true);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('a nova tentativa só usa o tempo que sobrou do timeout', async () => {
      const slow = new TcgdexClient({
        baseUrl: 'https://tcgdex.test/v2',
        timeoutMs: 300,
        fetch: fetchMock,
        logger,
        retryDelaysMs: [0, 0],
      });
      fetchMock.mockImplementationOnce(async () => {
        await new Promise((resolve) => setTimeout(resolve, 200));
        return down();
      });
      fetchMock.mockImplementation(
        (_url, init) =>
          new Promise((_resolve, reject) => {
            init?.signal?.addEventListener('abort', () => reject(abortError()));
          }),
      );
      const startedAt = Date.now();

      const err = await slow.getById('base1-4', 'en').catch((e: unknown) => e);

      expect((err as TcgdexUnavailableError).timeout).toBe(true);
      expect((err as Error).message).toBe('TCGdex não respondeu em 300 ms');
      expect(Date.now() - startedAt).toBeLessThan(450);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('não passa do tempo máximo somando as esperas', async () => {
      const slow = new TcgdexClient({
        baseUrl: 'https://tcgdex.test/v2',
        timeoutMs: 100,
        fetch: fetchMock,
        logger,
        retryDelaysMs: [200, 600],
      });
      fetchMock.mockImplementation(async () => down());

      await expect(slow.search({ lang: 'en', name: 'x', page: 1, limit: 20 })).rejects.toBeInstanceOf(
        TcgdexUnavailableError,
      );
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('resultado guardado quando a TCGdex cai (#145)', () => {
    let expiring: TcgdexClient;

    beforeEach(() => {
      expiring = new TcgdexClient({
        baseUrl: 'https://tcgdex.test/v2',
        timeoutMs: 8000,
        fetch: fetchMock,
        logger,
        setTtlMs: -1,
        retryDelaysMs: [],
      });
    });

    it('listSets devolve a lista vencida', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(200, [{ id: 'base1', name: 'Base Set' }]));
      await expiring.listSets('en');
      fetchMock.mockResolvedValueOnce(jsonResponse(503, {}));

      await expect(expiring.listSets('en')).resolves.toEqual([expect.objectContaining({ id: 'base1' })]);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('listSetCards devolve as cartas vencidas', async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse(200, { id: 'base1', name: 'Base Set', cards: [{ id: 'base1-4', localId: '4', name: 'Charizard' }] }),
      );
      await expiring.listSetCards('base1', 'en');
      fetchMock.mockResolvedValueOnce(jsonResponse(503, {}));

      await expect(expiring.listSetCards('base1', 'en')).resolves.toEqual([expect.objectContaining({ id: 'base1-4' })]);
    });

    it('listFilterValues devolve as listas vencidas', async () => {
      fetchMock.mockImplementation(async () => jsonResponse(200, ['Fire']));
      await expiring.listFilterValues('en');
      fetchMock.mockImplementation(async () => jsonResponse(503, {}));

      await expect(expiring.listFilterValues('en')).resolves.toEqual({
        types: ['Fire'],
        rarities: ['Fire'],
        categories: ['Fire'],
      });
      expect(logger.warn).toHaveBeenCalledWith(expect.objectContaining({ key: 'en' }), 'TCGdex fora, usando o resultado guardado');
    });

    it('detalhe usa a série e a data vencidas do set', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(200, tcgdexCard));
      fetchMock.mockResolvedValueOnce(
        jsonResponse(200, { id: 'base1', name: 'Base Set', serie: { id: 'base', name: 'Base' }, releaseDate: '1999-01-09' }),
      );
      await expiring.getById('base1-4', 'en');
      fetchMock.mockResolvedValueOnce(jsonResponse(200, tcgdexCard));
      fetchMock.mockResolvedValueOnce(jsonResponse(503, {}));

      const card = await expiring.getById('base1-4', 'en');

      expect(card.set).toMatchObject({ series: 'Base', releaseDate: '1999-01-09' });
    });

    it('sem nada guardado repassa o erro', async () => {
      fetchMock.mockImplementation(async () => jsonResponse(503, {}));

      await expect(expiring.listFilterValues('en')).rejects.toBeInstanceOf(TcgdexUnavailableError);
      await expect(expiring.listSetCards('base1', 'en')).rejects.toBeInstanceOf(TcgdexUnavailableError);
    });
  });
});
