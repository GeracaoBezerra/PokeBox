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
