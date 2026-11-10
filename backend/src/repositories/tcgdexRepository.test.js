import { jest } from '@jest/globals';

import { CardNotFoundError, fetchCardFromTcgdex, searchCardsInTcgdex } from './tcgdexRepository.js';
import { TcgdexUnavailableError } from '../utils/tcgdexError.js';

const jsonResponse = (status, body) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const abortError = () => Object.assign(new Error('This operation was aborted'), { name: 'AbortError' });

describe('tcgdexRepository', () => {
  let fetchSpy;

  beforeEach(() => {
    fetchSpy = jest.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('TCGdex respondendo 503 lança TcgdexUnavailableError sem timeout', async () => {
    fetchSpy.mockResolvedValue(jsonResponse(503, { error: 'down' }));

    const err = await fetchCardFromTcgdex('base1-4').catch((e) => e);

    expect(err).toBeInstanceOf(TcgdexUnavailableError);
    expect(err.timeout).toBe(false);
  });

  it('sem conexão (fetch failed) lança TcgdexUnavailableError', async () => {
    fetchSpy.mockRejectedValue(new TypeError('fetch failed'));

    const err = await searchCardsInTcgdex({ name: 'pikachu' }).catch((e) => e);

    expect(err).toBeInstanceOf(TcgdexUnavailableError);
    expect(err.timeout).toBe(false);
    expect(err.cause).toBeInstanceOf(TypeError);
  });

  it('timeout (AbortError) lança TcgdexUnavailableError com timeout', async () => {
    fetchSpy.mockRejectedValue(abortError());

    const err = await fetchCardFromTcgdex('base1-4').catch((e) => e);

    expect(err).toBeInstanceOf(TcgdexUnavailableError);
    expect(err.timeout).toBe(true);
  });

  it('404 no detalhe lança CardNotFoundError', async () => {
    fetchSpy.mockResolvedValue(jsonResponse(404, { error: 'not found' }));

    await expect(fetchCardFromTcgdex('nao-existe-999')).rejects.toBeInstanceOf(CardNotFoundError);
  });

  it('404 na busca devolve lista vazia', async () => {
    fetchSpy.mockResolvedValue(jsonResponse(404, { error: 'not found' }));

    await expect(searchCardsInTcgdex({ name: 'zzz' })).resolves.toEqual([]);
  });

  it('200 com JSON fora do formato lança TcgdexUnavailableError', async () => {
    fetchSpy.mockResolvedValue(jsonResponse(200, { foo: 'bar' }));

    await expect(fetchCardFromTcgdex('base1-4')).rejects.toBeInstanceOf(TcgdexUnavailableError);
    await expect(searchCardsInTcgdex({ name: 'pikachu' })).rejects.toBeInstanceOf(TcgdexUnavailableError);
  });

  it('200 com corpo que não é JSON lança TcgdexUnavailableError', async () => {
    fetchSpy.mockResolvedValue(new Response('<html>erro</html>', { status: 200 }));

    await expect(searchCardsInTcgdex({ name: 'pikachu' })).rejects.toBeInstanceOf(TcgdexUnavailableError);
  });

  it('busca com resposta válida devolve o resumo das cartas', async () => {
    fetchSpy.mockResolvedValue(
      jsonResponse(200, [{ id: 'base1-58', localId: '58', name: 'Pikachu', image: 'https://img/base1/58' }]),
    );

    await expect(searchCardsInTcgdex({ name: 'pikachu' })).resolves.toEqual([
      {
        id: 'base1-58',
        localId: '58',
        name: 'Pikachu',
        image: { small: 'https://img/base1/58/low.webp', large: 'https://img/base1/58/high.webp' },
      },
    ]);
  });
});
