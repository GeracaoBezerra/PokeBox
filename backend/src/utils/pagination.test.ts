import { toPage, toPageRequest, toSkipTake, type OptionalPageQuery } from './pagination.js';

type Query = OptionalPageQuery & Record<string, unknown>;

const request = (query: Query, passive?: string[]) => toPageRequest(query, passive);

describe('toSkipTake', () => {
  it.each([
    [{ page: 1, limit: 20 }, { skip: 0, take: 21 }],
    [{ page: 2, limit: 20 }, { skip: 20, take: 21 }],
    [{ page: 3, limit: 5 }, { skip: 10, take: 6 }],
  ])('%o → %o', (params, expected) => {
    expect(toSkipTake(params)).toEqual(expected);
  });
});

describe('toPage', () => {
  it('com uma linha a mais que o limite, corta e avisa que tem próxima página', () => {
    expect(toPage([1, 2, 3], { page: 1, limit: 2 })).toEqual({ items: [1, 2], hasNextPage: true });
  });

  it('com o limite exato, não tem próxima página', () => {
    expect(toPage([1, 2], { page: 1, limit: 2 })).toEqual({ items: [1, 2], hasNextPage: false });
  });

  it('lista vazia', () => {
    expect(toPage([], { page: 4, limit: 2 })).toEqual({ items: [], hasNextPage: false });
  });
});

describe('toPageRequest', () => {
  it('sem parâmetros não pagina', () => {
    expect(toPageRequest({})).toEqual({ filters: {}, page: null });
  });

  it('parâmetro com valor undefined não conta', () => {
    expect(request({ q: undefined })).toEqual({ filters: { q: undefined }, page: null });
  });

  it('qualquer filtro pagina na página 1 com 20 itens', () => {
    expect(request({ q: 'charizard' })).toEqual({ filters: { q: 'charizard' }, page: { page: 1, limit: 20 } });
  });

  it('page e limit saem dos filtros', () => {
    expect(request({ page: 2, limit: 5, sort: 'recent' })).toEqual({
      filters: { sort: 'recent' },
      page: { page: 2, limit: 5 },
    });
  });

  it('só limit usa page 1', () => {
    expect(toPageRequest({ limit: 3 }).page).toEqual({ page: 1, limit: 3 });
  });

  it('parâmetro passivo sozinho não pagina', () => {
    expect(request({ status: 'ACCEPTED' }, ['status'])).toEqual({ filters: { status: 'ACCEPTED' }, page: null });
  });

  it('parâmetro passivo junto com outro pagina', () => {
    expect(request({ status: 'ACCEPTED', side: 'sent' }, ['status']).page).toEqual({ page: 1, limit: 20 });
  });
});
