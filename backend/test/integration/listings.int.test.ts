import request from 'supertest';

import { addItem, bearer, createListing, PROFESSOR_OAK } from './support/flows.js';
import { loginSeedUser, registerUser, startTestApp, type TestApp } from './support/testApp.js';

let ctx: TestApp;

beforeAll(async () => {
  ctx = await startTestApp();
});

afterAll(() => ctx.close());

describe('POST /listings (RN-05)', () => {
  test('anuncia item da própria coleção', async () => {
    const user = await registerUser(ctx.app);
    const item = await addItem(ctx.app, user, { quantity: 2 });

    const listing = await createListing(ctx.app, user, item.id, 2);

    expect(listing).toMatchObject({ status: 'ACTIVE', quantity: 2 });
  });

  test('item de outra pessoa → 403', async () => {
    const owner = await registerUser(ctx.app);
    const other = await registerUser(ctx.app);
    const item = await addItem(ctx.app, owner);

    const res = await request(ctx.app).post('/listings').set(bearer(other)).send({ collectionItemId: item.id, quantity: 1 });

    expect(res.status).toBe(403);
  });

  test('mais do que tem → 422', async () => {
    const user = await registerUser(ctx.app);
    const item = await addItem(ctx.app, user, { quantity: 1 });

    const res = await request(ctx.app).post('/listings').set(bearer(user)).send({ collectionItemId: item.id, quantity: 2 });

    expect(res.status).toBe(422);
  });

  test('soma dos anúncios abertos não passa do disponível → 422', async () => {
    const user = await registerUser(ctx.app);
    const item = await addItem(ctx.app, user, { quantity: 2 });
    await createListing(ctx.app, user, item.id, 2);

    const res = await request(ctx.app).post('/listings').set(bearer(user)).send({ collectionItemId: item.id, quantity: 1 });

    expect(res.status).toBe(422);
  });
});

describe('PATCH /listings/:id', () => {
  test('pausado some para os outros e continua visível para o dono', async () => {
    const user = await registerUser(ctx.app);
    const listing = await createListing(ctx.app, user, (await addItem(ctx.app, user)).id);

    await request(ctx.app).patch(`/listings/${listing.id}`).set(bearer(user)).send({ status: 'PAUSED' }).expect(200);

    await request(ctx.app).get(`/listings/${listing.id}`).expect(404);
    await request(ctx.app).get(`/listings/${listing.id}`).set(bearer(user)).expect(200);
  });

  test('outra pessoa não mexe no anúncio → 403', async () => {
    const owner = await registerUser(ctx.app);
    const other = await registerUser(ctx.app);
    const listing = await createListing(ctx.app, owner, (await addItem(ctx.app, owner)).id);

    const res = await request(ctx.app).patch(`/listings/${listing.id}`).set(bearer(other)).send({ status: 'PAUSED' });

    expect(res.status).toBe(403);
  });

  test('fechado não volta a ativo', async () => {
    const user = await registerUser(ctx.app);
    const listing = await createListing(ctx.app, user, (await addItem(ctx.app, user)).id);
    await request(ctx.app).patch(`/listings/${listing.id}`).set(bearer(user)).send({ status: 'CLOSED' }).expect(200);

    const res = await request(ctx.app).patch(`/listings/${listing.id}`).set(bearer(user)).send({ status: 'ACTIVE' });

    expect(res.status).toBe(422);
  });

  test('só o ADMIN bloqueia; desbloquear volta como pausado', async () => {
    const user = await registerUser(ctx.app);
    const admin = await loginSeedUser(ctx.app, 'admin');
    const listing = await createListing(ctx.app, user, (await addItem(ctx.app, user)).id);

    const byOwner = await request(ctx.app).patch(`/listings/${listing.id}`).set(bearer(user)).send({ status: 'BLOCKED' });
    const blocked = await request(ctx.app).patch(`/listings/${listing.id}`).set(bearer(admin)).send({ status: 'BLOCKED' });
    const unblocked = await request(ctx.app).patch(`/listings/${listing.id}`).set(bearer(admin)).send({ status: 'PAUSED' });

    expect(byOwner.status).toBe(403);
    expect(blocked.status).toBe(200);
    expect(blocked.body.data.listing.status).toBe('BLOCKED');
    expect(unblocked.body.data.listing.status).toBe('PAUSED');
  });
});

describe('GET /listings (marketplace, #76)', () => {
  let username: string;

  beforeAll(async () => {
    const user = await registerUser(ctx.app, 'mkt');
    username = user.username;
    await createListing(ctx.app, user, (await addItem(ctx.app, user)).id);
    await createListing(ctx.app, user, (await addItem(ctx.app, user, { cardId: PROFESSOR_OAK, finish: 'NORMAL' })).id);
  });

  const search = (query: Record<string, string>) => request(ctx.app).get('/listings').query({ username, ...query });

  const cardIds = (res: request.Response) =>
    res.body.data.items.map((listing: { card: { id: string } }) => listing.card.id).sort();

  test('lista os anúncios ativos com paginação', async () => {
    const res = await search({});

    expect(res.status).toBe(200);
    expect(cardIds(res)).toEqual(['base1-4', 'base1-88']);
    expect(res.body.pagination).toMatchObject({ page: 1, hasNextPage: false });
  });

  test('q busca pelo nome da carta e do set', async () => {
    expect(cardIds(await search({ q: 'charizard base' }))).toEqual(['base1-4']);
    expect(cardIds(await search({ q: 'blastoise' }))).toEqual([]);
  });

  test('filtros de tipo e raridade não diferenciam maiúscula e se somam', async () => {
    expect(cardIds(await search({ type: 'fire' }))).toEqual(['base1-4']);
    expect(cardIds(await search({ rarity: 'uncommon' }))).toEqual(['base1-88']);
    expect(cardIds(await search({ type: 'fire', rarity: 'uncommon' }))).toEqual([]);
  });

  test('sort=name ordena pelo nome da carta', async () => {
    const res = await search({ sort: 'name' });

    expect(res.body.data.items.map((listing: { card: { name: string } }) => listing.card.name)).toEqual([
      'Charizard',
      'Professor Oak',
    ]);
  });

  test('valor inválido → 400 com details', async () => {
    const res = await search({ condition: 'NOVA' });

    expect(res.status).toBe(400);
    expect(res.body.details).toEqual(expect.arrayContaining([expect.objectContaining({ field: 'condition' })]));
  });

  test('GET /listings/me traz os meus em qualquer status', async () => {
    const user = await registerUser(ctx.app);
    const listing = await createListing(ctx.app, user, (await addItem(ctx.app, user)).id);
    await request(ctx.app).patch(`/listings/${listing.id}`).set(bearer(user)).send({ status: 'PAUSED' }).expect(200);

    const res = await request(ctx.app).get('/listings/me').set(bearer(user));

    expect(res.body.data.items).toEqual([expect.objectContaining({ id: listing.id, status: 'PAUSED' })]);
  });
});
