import request from 'supertest';

import { acceptedOffer, addItem, bearer, CHARIZARD, createListing, createTrade, PROFESSOR_OAK } from './support/flows.js';
import { loginSeedUser, registerUser, startTestApp, type TestApp, type TestUser } from './support/testApp.js';

let ctx: TestApp;

beforeAll(async () => {
  ctx = await startTestApp();
});

afterAll(() => ctx.close());

const PIKACHU = 'base1-58';

type Named = { id: string; card: { name: string } };

const names = (items: Named[]) => items.map((item) => item.card.name);

async function collector(): Promise<TestUser> {
  const user = await registerUser(ctx.app);
  await addItem(ctx.app, user, { cardId: CHARIZARD });
  await addItem(ctx.app, user, { cardId: PROFESSOR_OAK, finish: 'NORMAL' });
  await addItem(ctx.app, user, { cardId: PIKACHU, finish: 'NORMAL', isPublic: false });
  return user;
}

describe('GET /collection paginado (#77)', () => {
  test('sem parâmetro responde como antes: lista inteira e sem pagination', async () => {
    const user = await collector();

    const res = await request(ctx.app).get('/collection').set(bearer(user));

    expect(res.status).toBe(200);
    expect(names(res.body.data.items)).toEqual(['Charizard', 'Pikachu', 'Professor Oak']);
    expect(res.body).not.toHaveProperty('pagination');
  });

  test('limit=2 traz 2 itens e hasNextPage; page=2 traz o seguinte sem repetir', async () => {
    const user = await collector();

    const first = await request(ctx.app).get('/collection?limit=2').set(bearer(user));
    const second = await request(ctx.app).get('/collection?limit=2&page=2').set(bearer(user));

    expect(names(first.body.data.items)).toEqual(['Charizard', 'Pikachu']);
    expect(first.body.pagination).toEqual({ page: 1, limit: 2, hasNextPage: true });
    expect(names(second.body.data.items)).toEqual(['Professor Oak']);
    expect(second.body.pagination).toEqual({ page: 2, limit: 2, hasNextPage: false });
  });

  test('q=charizard traz só o Charizard e já vem paginado', async () => {
    const user = await collector();

    const res = await request(ctx.app).get('/collection?q=charizard').set(bearer(user));

    expect(names(res.body.data.items)).toEqual(['Charizard']);
    expect(res.body.pagination).toEqual({ page: 1, limit: 20, hasNextPage: false });
  });

  test('isPublic, type, finish e sort=recent', async () => {
    const user = await collector();
    const get = (query: string) => request(ctx.app).get(`/collection?${query}`).set(bearer(user));

    expect(names((await get('isPublic=false')).body.data.items)).toEqual(['Pikachu']);
    expect(names((await get('type=fire')).body.data.items)).toEqual(['Charizard']);
    expect(names((await get('finish=normal')).body.data.items)).toEqual(['Pikachu', 'Professor Oak']);
    expect(names((await get('sort=recent')).body.data.items)).toEqual(['Pikachu', 'Professor Oak', 'Charizard']);
  });

  test('isPublic=false como ash traz só os itens privados do seed', async () => {
    const token = await loginSeedUser(ctx.app, 'ash');

    const res = await request(ctx.app).get('/collection?isPublic=false').set(bearer(token));

    expect(res.status).toBe(200);
    expect(res.body.data.items.length).toBeGreaterThan(0);
    expect(res.body.data.items.every((item: { isPublic: boolean }) => item.isPublic === false)).toBe(true);
    expect(names(res.body.data.items)).toContain('Furret');
  });

  test('limit=500 → 400 com details', async () => {
    const user = await registerUser(ctx.app);

    const res = await request(ctx.app).get('/collection?limit=500').set(bearer(user));

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.details).toEqual([{ field: 'limit', message: 'limit máximo é 100' }]);
  });
});

describe('GET /wishlist paginado (#77)', () => {
  test('type=Fire como misty traz só cartas de fogo, com opportunities', async () => {
    const token = await loginSeedUser(ctx.app, 'misty');

    const all = await request(ctx.app).get('/wishlist').set(bearer(token));
    const fire = await request(ctx.app).get('/wishlist?type=Fire').set(bearer(token));

    expect(all.body).not.toHaveProperty('pagination');
    expect(all.body.data.items.length).toBeGreaterThan(fire.body.data.items.length);
    expect(fire.body.data.items.length).toBeGreaterThan(0);
    expect(fire.body.data.items.every((item: { card: { types: string[] } }) => item.card.types.includes('Fire'))).toBe(true);
    expect(fire.body.data.items[0]).toHaveProperty('opportunities');
    expect(fire.body.pagination).toEqual({ page: 1, limit: 20, hasNextPage: false });
  });
});

describe('GET /users/:username/collection paginado (#77)', () => {
  test('limit=1 traz 1 item, mantém user em data e privados continuam fora (RN-10)', async () => {
    const user = await collector();

    const res = await request(ctx.app).get(`/users/${user.username}/collection?limit=1`);
    const hidden = await request(ctx.app).get(`/users/${user.username}/collection?q=pikachu`);

    expect(res.status).toBe(200);
    expect(res.body.data.user.username).toBe(user.username);
    expect(names(res.body.data.items)).toEqual(['Charizard']);
    expect(res.body.pagination).toEqual({ page: 1, limit: 1, hasNextPage: true });
    expect(hidden.body.data.items).toEqual([]);
  });

  test('sem parâmetro responde como antes', async () => {
    const user = await collector();

    const res = await request(ctx.app).get(`/users/${user.username}/collection`);

    expect(names(res.body.data.items)).toEqual(['Charizard', 'Professor Oak']);
    expect(res.body).not.toHaveProperty('pagination');
  });
});

describe('GET /offers/me e /trades/me com side (#77)', () => {
  test('sem side responde { sent, received }; side=received responde { items } paginado', async () => {
    const owner = await registerUser(ctx.app);
    const proposer = await registerUser(ctx.app);
    const { offer } = await acceptedOffer(ctx.app, owner, proposer);

    const legacy = await request(ctx.app).get('/offers/me?status=ACCEPTED').set(bearer(owner));
    const received = await request(ctx.app).get('/offers/me?side=received').set(bearer(owner));
    const sent = await request(ctx.app).get('/offers/me?side=sent&limit=5').set(bearer(owner));

    expect(Object.keys(legacy.body.data).sort()).toEqual(['received', 'sent']);
    expect(legacy.body.data.received.map((o: { id: string }) => o.id)).toEqual([offer.id]);
    expect(legacy.body).not.toHaveProperty('pagination');
    expect(received.body.data.items.map((o: { id: string }) => o.id)).toEqual([offer.id]);
    expect(received.body.pagination).toEqual({ page: 1, limit: 20, hasNextPage: false });
    expect(sent.body.data).toEqual({ items: [] });
    expect(sent.body.pagination).toEqual({ page: 1, limit: 5, hasNextPage: false });
  });

  test.each(['/offers/me?page=1', '/trades/me?limit=5'])('%s sem side → 400 com details', async (path) => {
    const user = await registerUser(ctx.app);

    const res = await request(ctx.app).get(path).set(bearer(user));

    expect(res.status).toBe(400);
    expect(res.body.details[0].field).toBe('side');
  });

  test('trocas: side=sent pagina, sem side mantém { sent, received }', async () => {
    const owner = await registerUser(ctx.app);
    const proposer = await registerUser(ctx.app);
    const { offer } = await acceptedOffer(ctx.app, owner, proposer);
    const trade = await createTrade(ctx.app, proposer, offer.id);

    const legacy = await request(ctx.app).get('/trades/me').set(bearer(proposer));
    const sent = await request(ctx.app).get('/trades/me?side=sent&status=PROPOSED').set(bearer(proposer));

    expect(legacy.body.data.sent.map((t: { id: string }) => t.id)).toEqual([trade.id]);
    expect(legacy.body.data.received).toEqual([]);
    expect(sent.body.data.items.map((t: { id: string }) => t.id)).toEqual([trade.id]);
    expect(sent.body.pagination).toEqual({ page: 1, limit: 20, hasNextPage: false });
  });
});

describe('GET /listings/me paginado (#77)', () => {
  test('sem parâmetro como antes; limit=1 pagina', async () => {
    const owner = await registerUser(ctx.app);
    const charizard = await addItem(ctx.app, owner, { cardId: CHARIZARD });
    const oak = await addItem(ctx.app, owner, { cardId: PROFESSOR_OAK, finish: 'NORMAL' });
    await createListing(ctx.app, owner, charizard.id);
    await createListing(ctx.app, owner, oak.id);

    const all = await request(ctx.app).get('/listings/me').set(bearer(owner));
    const first = await request(ctx.app).get('/listings/me?limit=1').set(bearer(owner));
    const second = await request(ctx.app).get('/listings/me?limit=1&page=2').set(bearer(owner));

    expect(all.body.data.items).toHaveLength(2);
    expect(all.body).not.toHaveProperty('pagination');
    expect(first.body.data.items).toHaveLength(1);
    expect(first.body.pagination).toEqual({ page: 1, limit: 1, hasNextPage: true });
    expect(second.body.data.items[0].id).not.toBe(first.body.data.items[0].id);
    expect(second.body.pagination.hasNextPage).toBe(false);
  });
});
