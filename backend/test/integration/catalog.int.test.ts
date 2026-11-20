import request from 'supertest';

import type { CatalogEntry } from '../../src/cards/search/CatalogSearchStore.js';
import { PrismaCatalogSearchStore } from '../../src/cards/search/PrismaCatalogSearchStore.js';
import { CHARIZARD } from './support/flows.js';
import { startTestApp, uniqueName, type TestApp } from './support/testApp.js';

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
  await ctx.container.infra.prisma.catalogSet.deleteMany();
  await ctx.container.infra.prisma.catalogFilterValue.deleteMany();
  await ctx.close();
});

describe('GET /cards com o catálogo local vazio', () => {
  test.each(['recent', 'wanted', 'traded'])('ranking %s não consulta a TCGdex', async (sort) => {
    const callsBefore = ctx.tcgdex.calls();
    const res = await request(ctx.app).get('/cards').query({ lang: 'pt', sort });
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
    expect(res.body.pagination.hasNextPage).toBe(false);
    expect(ctx.tcgdex.calls()).toBe(callsBefore);
  });
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

describe('GET /cards e /cards/filters com os filtros sincronizados (#158)', () => {
  const distinct = (values: (string | null)[]) =>
    [...new Set(values.filter((value): value is string => value !== null))].sort();

  beforeAll(async () => {
    const cards = ctx.tcgdex.cards;
    await store.saveSets('en', [
      { id: 'vazio1', name: 'Coleção sem cartas' },
      ...new Map(cards.map((card) => [card.setId, { id: card.setId, name: card.setName }])).values(),
    ]);
    await store.saveAttributes(
      'en',
      cards.map((card) => ({ id: card.id, types: card.types, rarity: card.rarity, category: card.category })),
    );
    await store.saveFilterValues('en', {
      types: distinct(cards.flatMap((card) => card.types)),
      rarities: distinct(cards.map((card) => card.rarity)),
      categories: distinct(cards.map((card) => card.category)),
    });
    ctx.tcgdex.failWith(503);
  });

  afterAll(() => ctx.tcgdex.failWith(null));

  test('painel de filtros responde pelo banco com a TCGdex fora', async () => {
    const res = await request(ctx.app).get('/cards/filters');

    expect(res.status).toBe(200);
    expect(res.body.data.types).toContain('Fire');
    expect(res.body.data.categories).toEqual(expect.arrayContaining(['Pokemon', 'Trainer']));
    expect(res.body.data.sets).toContainEqual({ id: 'base1', name: 'Base Set' });
  });

  test('painel de filtros não lista coleção sem nenhuma carta no idioma (#196)', async () => {
    const res = await request(ctx.app).get('/cards/filters');
    const setIds: string[] = res.body.data.sets.map((set: { id: string }) => set.id);

    expect(setIds).not.toContain('vazio1');
    expect(setIds).toContain('base1');
  });

  test('filtro de tipo sem nome responde pelo banco, e o tipo não diferencia maiúscula', async () => {
    const res = await request(ctx.app).get('/cards').query({ type: 'fire', limit: 100 });

    expect(res.status).toBe(200);
    expect(ids(res)).toContain(CHARIZARD);
    const fire = ctx.tcgdex.cards.filter((card) => card.types.includes('Fire')).map((card) => card.id);
    expect(ids(res).every((id) => fire.includes(id))).toBe(true);
  });

  test('nome com filtro de categoria responde pelo banco', async () => {
    const res = await request(ctx.app).get('/cards').query({ name: 'charizard', category: 'Trainer' });

    expect(res.status).toBe(200);
    expect(ids(res)).not.toContain(CHARIZARD);
  });

  test('lista sem nome e sem filtro pagina o catálogo local', async () => {
    const first = await request(ctx.app).get('/cards').query({ limit: 5 });
    const second = await request(ctx.app).get('/cards').query({ limit: 5, page: 2 });

    expect(first.status).toBe(200);
    expect(first.body.data).toHaveLength(5);
    expect(first.body.pagination).toMatchObject({ hasNextPage: true });
    expect(ids(second).filter((id) => ids(first).includes(id))).toEqual([]);
  });

  test('valor de filtro que não existe continua dando 400', async () => {
    const res = await request(ctx.app).get('/cards').query({ type: 'Plasma' });

    expect(res.status).toBe(400);
  });
});

describe('GET /cards com rankings da home (#92)', () => {
  const firstId = 'rank92-1';
  const secondId = 'rank92-2';
  let userIds: string[] = [];
  const tradeIds: string[] = [];

  beforeAll(async () => {
    const db = ctx.container.infra.prisma;
    const currentSets = await store.listSets('en');
    await store.saveSets('en', [
      ...currentSets,
      { id: 'rank-old', name: 'Ranking Old' },
      { id: 'rank-new', name: 'Ranking New' },
    ]);
    await store.save('en', [
      { id: firstId, localId: '1', name: 'Ranking Alpha', setId: 'rank-old', setName: 'Ranking Old', imageUrl: null },
      { id: secondId, localId: '2', name: 'Ranking Beta', setId: 'rank-new', setName: 'Ranking New', imageUrl: null },
    ]);
    await db.card.createMany({
      data: [
        { id: firstId, name: 'Ranking Alpha', setId: 'rank-old', setName: 'Ranking Old', number: '1' },
        { id: secondId, name: 'Ranking Beta', setId: 'rank-new', setName: 'Ranking New', number: '2' },
      ],
      skipDuplicates: true,
    });
    const users = await Promise.all(
      [1, 2, 3].map((index) => {
        const username = uniqueName(`rank${index}`);
        return db.user.create({
          data: {
            username,
            name: `Ranking ${index}`,
            email: `${username}@teste.dev`,
            phone: `8599999000${index}`,
            passwordHash: 'teste',
            accountStatus: index === 3 ? 'INACTIVE' : 'ACTIVE',
            emailVerified: true,
          },
        });
      }),
    );
    userIds = users.map((user) => user.id);
    await db.wishlistItem.createMany({
      data: [
        { userId: users[0].id, cardId: firstId },
        { userId: users[1].id, cardId: firstId },
        { userId: users[0].id, cardId: secondId },
        { userId: users[2].id, cardId: secondId },
      ],
    });
    const trade = await db.trade.create({
      data: {
        proposerId: users[0].id,
        recipientId: users[1].id,
        status: 'ACCEPTED',
        completedAt: new Date(),
        items: {
          create: [
            { cardId: firstId, condition: 'NEAR_MINT', finish: 'NORMAL', quantity: 3, fromUserId: users[0].id, toUserId: users[1].id },
            { cardId: secondId, condition: 'NEAR_MINT', finish: 'NORMAL', quantity: 1, fromUserId: users[1].id, toUserId: users[0].id },
          ],
        },
      },
    });
    tradeIds.push(trade.id);
    const proposed = await db.trade.create({
      data: {
        proposerId: users[0].id,
        recipientId: users[1].id,
        status: 'PROPOSED',
        items: {
          create: {
            cardId: secondId, condition: 'NEAR_MINT', finish: 'NORMAL', quantity: 10,
            fromUserId: users[0].id, toUserId: users[1].id,
          },
        },
      },
    });
    tradeIds.push(proposed.id);
  });

  afterAll(async () => {
    const db = ctx.container.infra.prisma;
    await db.trade.deleteMany({ where: { id: { in: tradeIds } } });
    await db.wishlistItem.deleteMany({ where: { userId: { in: userIds } } });
    await db.card.deleteMany({ where: { id: { in: [firstId, secondId] } } });
    await db.user.deleteMany({ where: { id: { in: userIds } } });
  });

  test('mais desejadas agrega contas ativas antes de paginar', async () => {
    const res = await request(ctx.app).get('/cards').query({ name: 'Ranking', sort: 'wanted', limit: 2 });

    expect(res.status).toBe(200);
    expect(res.body.data[0]).toMatchObject({ id: firstId, wishlistCount: 2 });
    expect(res.body.data[1]).toMatchObject({ id: secondId, wishlistCount: 1 });
  });

  test('mais trocadas soma somente unidades de trocas concluídas', async () => {
    const res = await request(ctx.app).get('/cards').query({ name: 'Ranking', sort: 'traded', order: 'desc', limit: 2 });

    expect(res.status).toBe(200);
    expect(res.body.data[0]).toMatchObject({ id: firstId, tradeCount: 3 });
    expect(res.body.data[1]).toMatchObject({ id: secondId, tradeCount: 1 });
  });

  test('mais recentes segue a ordem de lançamento sincronizada dos sets', async () => {
    const res = await request(ctx.app).get('/cards').query({ name: 'Ranking', sort: 'recent', order: 'desc', limit: 1 });

    expect(res.status).toBe(200);
    expect(res.body.data[0].id).toBe(secondId);
  });
});
