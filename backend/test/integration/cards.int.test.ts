import request from 'supertest';

import { addItem, bearer, CHARIZARD } from './support/flows.js';
import { registerUser, startTestApp, type TestApp } from './support/testApp.js';

let ctx: TestApp;

beforeAll(async () => {
  ctx = await startTestApp();
});

afterAll(() => ctx.close());

const ids = (res: request.Response) => res.body.data.map((card: { id: string }) => card.id);

describe('GET /cards', () => {
  test('busca por nome com paginação', async () => {
    const res = await request(ctx.app).get('/cards').query({ name: 'charizard' });

    expect(res.status).toBe(200);
    expect(ids(res)).toContain(CHARIZARD);
  });

  test('busca esperta (#74): "charizard base" põe o do Base Set primeiro e explica a busca', async () => {
    const res = await request(ctx.app).get('/cards').query({ name: 'charizard base' });

    expect(res.status).toBe(200);
    expect(ids(res)[0]).toBe(CHARIZARD);
    expect(res.body.search.sets).toEqual(['Base Set']);
  });

  test('palavras que não acham nada vão para search.ignored', async () => {
    const res = await request(ctx.app).get('/cards').query({ name: 'charizard base x pipi popo' });

    expect(ids(res)).toContain(CHARIZARD);
    expect(res.body.search.ignored).toEqual(expect.arrayContaining(['pipi']));
  });

  test('ids que o detalhe recusa ficam fora da lista (#127)', async () => {
    const res = await request(ctx.app).get('/cards').query({ name: 'unown' });

    expect(res.status).toBe(200);
    expect(ids(res)).not.toContain('exu-!');
    expect(ids(res)).toContain('exu-A');
  });

  test('limit acima de 100 → 400', async () => {
    const res = await request(ctx.app).get('/cards').query({ limit: 500 });

    expect(res.status).toBe(400);
  });
});

describe('GET /cards/:id', () => {
  test('sem login: detalhe, anúncios e user null', async () => {
    const res = await request(ctx.app).get(`/cards/${CHARIZARD}`);

    expect(res.status).toBe(200);
    expect(res.body.data.card).toMatchObject({ id: CHARIZARD, types: ['Fire'] });
    expect(res.body.data.listings).toEqual(expect.any(Array));
    expect(res.body.data.user).toBeNull();
  });

  test('com login: user diz quantas a pessoa tem e se está na wishlist ou anunciada', async () => {
    const user = await registerUser(ctx.app);
    await addItem(ctx.app, user, { quantity: 2 });

    const res = await request(ctx.app).get(`/cards/${CHARIZARD}`).set(bearer(user));

    expect(res.body.data.user).toEqual({ inCollection: 2, inWishlist: false, onTradeList: false });
  });

  test('carta que não existe → 404; id fora da regra → 400', async () => {
    await request(ctx.app).get('/cards/nao-existe-1').expect(404);
    await request(ctx.app).get(`/cards/${encodeURIComponent('exu-!')}`).expect(400);
  });
});

describe('filtros do catálogo (#75)', () => {
  const seedCard = (id: string) => ctx.tcgdex.cards.find((card) => card.id === id)!;
  const names = (res: request.Response) => res.body.data.map((card: { name: string }) => card.name);

  test('GET /cards/filters traz tipos, raridades, categorias e sets', async () => {
    const res = await request(ctx.app).get('/cards/filters');

    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toBe('public, max-age=3600');
    expect(res.body.data.types).toContain('Fire');
    expect(res.body.data.rarities).toContain('Rare Holo');
    expect(res.body.data.categories).toEqual(['Energy', 'Pokemon', 'Trainer']);
    expect(res.body.data.sets).toContainEqual({ id: 'base1', name: 'Base Set' });
  });

  test('type=Fire sem nome traz só cartas de fogo', async () => {
    const res = await request(ctx.app).get('/cards').query({ type: 'Fire', limit: 100 });

    expect(res.status).toBe(200);
    expect(ids(res).length).toBeGreaterThan(0);
    for (const id of ids(res)) expect(seedCard(id).types).toContain('Fire');
  });

  test('mesmo nome com tipos diferentes dá resultados diferentes (cache separado)', async () => {
    const fire = await request(ctx.app).get('/cards').query({ name: 'charizard', type: 'Fire' });
    const darkness = await request(ctx.app).get('/cards').query({ name: 'charizard', type: 'Darkness' });

    expect(ids(fire)).toContain(CHARIZARD);
    expect(ids(darkness)).not.toContain(CHARIZARD);
    expect(ids(darkness)).toEqual(expect.arrayContaining(['sv03-125']));
  });

  test('nome + raridade + set juntos', async () => {
    const res = await request(ctx.app).get('/cards').query({ name: 'charizard', rarity: 'rare', set: 'base1' });

    expect(ids(res)).toEqual([CHARIZARD]);
  });

  test('category=Trainer, ordem alfabética invertida e paginação', async () => {
    const first = await request(ctx.app).get('/cards').query({ category: 'Trainer', sort: 'name', order: 'desc', limit: 5 });
    const second = await request(ctx.app)
      .get('/cards')
      .query({ category: 'Trainer', sort: 'name', order: 'desc', limit: 5, page: 2 });

    const all = [...names(first), ...names(second)];
    expect(first.body.pagination.hasNextPage).toBe(true);
    expect(all).toHaveLength(10);
    expect(all).toEqual([...all].sort((a, b) => b.localeCompare(a)));
    for (const id of [...ids(first), ...ids(second)]) expect(seedCard(id).category).toBe('Trainer');
  });

  test('category=Monstro → 400 com details; sort=price → 400', async () => {
    const monstro = await request(ctx.app).get('/cards').query({ category: 'Monstro' });
    const price = await request(ctx.app).get('/cards').query({ sort: 'price' });

    expect(monstro.status).toBe(400);
    expect(monstro.body.details).toEqual([{ field: 'category', message: expect.stringContaining('Monstro') }]);
    expect(price.status).toBe(400);
    expect(price.body.details[0].field).toBe('sort');
  });

  test('GET /cards/filters com a TCGdex fora → 502', async () => {
    const down = await startTestApp();
    down.tcgdex.failWith(503);
    try {
      const res = await request(down.app).get('/cards/filters');

      expect(res.status).toBe(502);
    } finally {
      await down.close();
    }
  });
});
