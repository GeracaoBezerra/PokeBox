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
  let logger: { error: jest.Mock<(...args: unknown[]) => void> };
  let client: TcgdexClient;

  beforeEach(() => {
    fetchMock = jest.fn<FetchFn>();
    logger = { error: jest.fn() };
    client = new TcgdexClient({ baseUrl: 'https://tcgdex.test/v2', timeoutMs: 8000, fetch: fetchMock, logger });
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
    expect(logger.error).toHaveBeenCalledWith('Falha ao buscar o set base1 na TCGdex:', 'TCGdex respondeu 503');
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
    fetchMock.mockResolvedValueOnce(jsonResponse(503, { error: 'down' }));
    fetchMock.mockResolvedValueOnce(jsonResponse(200, [{ id: 'base1', name: 'Base Set' }]));

    await expect(client.listSets('de')).resolves.toEqual([]);
    await expect(client.listSets('de')).resolves.toHaveLength(1);
    expect(logger.error).toHaveBeenCalledTimes(1);
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
});
