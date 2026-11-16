import request from 'supertest';

import type { CatalogEntry } from '../../src/cards/search/CatalogSearchStore.js';
import { PrismaCatalogSearchStore } from '../../src/cards/search/PrismaCatalogSearchStore.js';
import { CHARIZARD } from './support/flows.js';
import { startTestApp, type TestApp } from './support/testApp.js';

let ctx: TestApp;
let store: PrismaCatalogSearchStore;

const FLABEBE: CatalogEntry = {
  id: 'xy7-64',
  localId: '64',
  name: 'Flabébé',
  setId: 'xy7',
  setName: 'Ancient Origins',
  imageUrl: null,
};

const ids = (res: request.Response): string[] => res.body.data.map((card: { id: string }) => card.id);

beforeAll(async () => {
  ctx = await startTestApp();
  store = new PrismaCatalogSearchStore(ctx.container.infra.prisma);
});

afterAll(async () => {
  await ctx.container.infra.prisma.catalogCard.deleteMany();
  await ctx.close();
});

describe('GET /cards com o catálogo local vazio', () => {
  test('busca pela TCGdex (fase 1) e não tolera erro de digitação', async () => {
    const found = await request(ctx.app).get('/cards').query({ name: 'charizard' });
    const typo = await request(ctx.app).get('/cards').query({ name: 'charzard' });

    expect(ids(found)).toContain(CHARIZARD);
    expect(ids(typo)).toEqual([]);
  });
});

describe('GET /cards com o catálogo local preenchido (#78)', () => {
  beforeAll(async () => {
    const entries = ctx.tcgdex.cards.map((card) => ({
      id: card.id,
      localId: card.number.split('/')[0],
      name: card.name,
      setId: card.setId,
      setName: card.setName,
      imageUrl: card.imageUrl,
    }));
    await store.save('en', [...entries, FLABEBE]);
  });

  test('salvar de novo não duplica (sync idempotente)', async () => {
    const before = await ctx.container.infra.prisma.catalogCard.count();
    await store.save('en', [FLABEBE]);

    expect(await ctx.container.infra.prisma.catalogCard.count()).toBe(before);
  });

  test('erro de digitação: charzard acha os Charizard sem chamar a TCGdex', async () => {
    const callsBefore = ctx.tcgdex.calls();
    const res = await request(ctx.app).get('/cards').query({ name: 'charzard' });

    expect(res.status).toBe(200);
    expect(ids(res)).toContain(CHARIZARD);
    expect(res.body.data.find((card: { id: string }) => card.id === CHARIZARD)).toMatchObject({
      number: '4',
      set: { id: 'base1', name: 'Base Set' },
    });
    expect(res.body.search).toEqual({ name: 'charzard', sets: [], ignored: [] });
    expect(ctx.tcgdex.calls()).toBe(callsBefore);
  });

  test('"charizard base" põe o do Base Set primeiro', async () => {
    const res = await request(ctx.app).get('/cards').query({ name: 'charizard base' });

    expect(ids(res)[0]).toBe(CHARIZARD);
    expect(res.body.search.sets).toContain('Base Set');
  });

  test('pikachu paginado: a segunda página continua a primeira sem repetir', async () => {
    const first = await request(ctx.app).get('/cards').query({ name: 'pikachu', limit: 3 });
    const second = await request(ctx.app).get('/cards').query({ name: 'pikachu', limit: 3, page: 2 });

    expect(first.body.data).toHaveLength(3);
    expect(first.body.pagination).toMatchObject({ hasNextPage: true });
    expect(second.body.data.length).toBeGreaterThan(0);
    expect(ids(second).filter((id) => ids(first).includes(id))).toEqual([]);
  });

  test('acento não importa: flabebe acha a Flabébé', async () => {
    const res = await request(ctx.app).get('/cards').query({ name: 'flabebe' });

    expect(ids(res)).toEqual([FLABEBE.id]);
  });

  test('palavras que não acham nada vão para search.ignored', async () => {
    const res = await request(ctx.app).get('/cards').query({ name: 'charizard pipi popo' });

    expect(ids(res)).toContain(CHARIZARD);
    expect(res.body.search.ignored).toEqual(['pipi', 'popo']);
  });

  test('ordenação por nome decrescente', async () => {
    const res = await request(ctx.app).get('/cards').query({ name: 'charizard', sort: 'name', order: 'desc' });
    const names: string[] = res.body.data.map((card: { name: string }) => card.name);

    expect(names[0]).toBe('Radiant Charizard');
    expect([...names].sort((a, b) => b.localeCompare(a))).toEqual(names);
  });

  test('só o nome do set: lista as cartas do set', async () => {
    const res = await request(ctx.app).get('/cards').query({ name: 'base set', limit: 100 });

    expect(ids(res)).toContain(CHARIZARD);
    expect(res.body.search).toMatchObject({ name: null, ignored: [] });
    expect(res.body.search.sets).toContain('Base Set');
  });

  test('filtro de set com nome: só cartas do set pedido', async () => {
    const res = await request(ctx.app).get('/cards').query({ name: 'charizard', set: 'base1' });

    expect(ids(res)).toEqual([CHARIZARD]);
  });

  test('TCGdex fora do ar: a busca continua respondendo', async () => {
    ctx.tcgdex.failWith(500);
    try {
      const res = await request(ctx.app).get('/cards').query({ name: 'pikachuu' });

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
    } finally {
      ctx.tcgdex.failWith(null);
    }
  });
});
