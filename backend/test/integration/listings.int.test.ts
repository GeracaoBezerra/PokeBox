import request from 'supertest';

import { acceptedOffer, addItem, bearer, CHARIZARD, createListing, makeOffer, PROFESSOR_OAK } from './support/flows.js';
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

  test('wishlist é da sessão, filtra antes de paginar e só devolve selos da página', async () => {
    const viewer = await registerUser(ctx.app);
    const other = await registerUser(ctx.app);
    await request(ctx.app).post('/wishlist').set(bearer(viewer)).send({ cardId: PROFESSOR_OAK }).expect(201);
    await request(ctx.app).post('/wishlist').set(bearer(other)).send({ cardId: CHARIZARD }).expect(201);

    await search({ wishlist: 'true' }).expect(401);
    await search({ includeWishlist: 'true' }).expect(401);
    const primeira = await search({ includeWishlist: 'true', sort: 'name', limit: '1' }).set(bearer(viewer)).expect(200);
    expect(cardIds(primeira)).toEqual([CHARIZARD]);
    expect(primeira.body.data.wishlistCardIds).toEqual([]);
    const filtrada = await search({ wishlist: 'true', includeWishlist: 'true', sort: 'name', limit: '1' })
      .set(bearer(viewer)).expect(200);
    expect(cardIds(filtrada)).toEqual([PROFESSOR_OAK]);
    expect(filtrada.body.data.wishlistCardIds).toEqual([PROFESSOR_OAK]);
    expect(filtrada.body.pagination.hasNextPage).toBe(false);
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

describe('anúncio Em troca', () => {
  test('marketplace: Em troca vem depois de todos os ativos, inclusive entre páginas', async () => {
    const owner = await registerUser(ctx.app, 'emt');
    const proposer = await registerUser(ctx.app);
    const { listing: busy } = await acceptedOffer(ctx.app, owner, proposer);
    const active = await createListing(
      ctx.app,
      owner,
      (await addItem(ctx.app, owner, { cardId: PROFESSOR_OAK, finish: 'NORMAL' })).id,
    );

    const all = await request(ctx.app).get('/listings').query({ username: owner.username });
    const first = await request(ctx.app).get('/listings').query({ username: owner.username, sort: 'oldest', limit: 1 });
    const second = await request(ctx.app).get('/listings').query({ username: owner.username, sort: 'oldest', limit: 1, page: 2 });

    expect(all.body.data.items.map((l: { id: string; status: string }) => [l.id, l.status])).toEqual([
      [active.id, 'ACTIVE'],
      [busy.id, 'IN_TRADE'],
    ]);
    expect(first.body.data.items.map((l: { id: string }) => l.id)).toEqual([active.id]);
    expect(first.body.pagination.hasNextPage).toBe(true);
    expect(second.body.data.items.map((l: { id: string }) => l.id)).toEqual([busy.id]);
  });

  test('detalhe é público e sem dados da negociação', async () => {
    const owner = await registerUser(ctx.app);
    const proposer = await registerUser(ctx.app);
    const { listing } = await acceptedOffer(ctx.app, owner, proposer);

    const res = await request(ctx.app).get(`/listings/${listing.id}`);

    expect(res.status).toBe(200);
    expect(res.body.data.listing).toMatchObject({ status: 'IN_TRADE', quantity: 0 });
    expect(JSON.stringify(res.body)).not.toContain(proposer.username);
    expect(JSON.stringify(res.body)).not.toMatch(/"(proposer|offers?|offerId|trades?|tradeId)"/);
  });

  test('dono não muda a quantidade (409); pausa; fechar cancela as ofertas em espera', async () => {
    const owner = await registerUser(ctx.app);
    const proposer = await registerUser(ctx.app);
    const waiting = await registerUser(ctx.app);
    const ownerItem = await addItem(ctx.app, owner);
    const listing = await createListing(ctx.app, owner, ownerItem.id);
    const oakOf = async (user: typeof owner) => addItem(ctx.app, user, { cardId: PROFESSOR_OAK, finish: 'NORMAL' });
    const first = await makeOffer(ctx.app, proposer, listing.id, [{ collectionItemId: (await oakOf(proposer)).id, quantity: 1 }]);
    const held = await makeOffer(ctx.app, waiting, listing.id, [{ collectionItemId: (await oakOf(waiting)).id, quantity: 1 }]);
    await request(ctx.app).patch(`/offers/${first.id}/status`).set(bearer(owner)).send({ status: 'ACCEPTED' }).expect(200);

    await request(ctx.app).patch(`/listings/${listing.id}`).set(bearer(owner)).send({ quantity: 1 }).expect(409);
    await request(ctx.app).patch(`/listings/${listing.id}`).set(bearer(owner)).send({ status: 'ACTIVE' }).expect(409);
    await request(ctx.app).patch(`/listings/${listing.id}`).set(bearer(owner)).send({ status: 'PAUSED' }).expect(200);
    await request(ctx.app).patch(`/listings/${listing.id}`).set(bearer(owner)).send({ status: 'CLOSED' }).expect(200);
    const offer = await request(ctx.app).get(`/offers/${held.id}`).set(bearer(waiting));

    expect(offer.body.data.offer).toMatchObject({ status: 'CANCELED', cancelReason: 'LISTING_CLOSED' });
  });

  test('ADMIN bloqueia anúncio Em troca', async () => {
    const owner = await registerUser(ctx.app);
    const proposer = await registerUser(ctx.app);
    const admin = await loginSeedUser(ctx.app, 'admin');
    const { listing } = await acceptedOffer(ctx.app, owner, proposer);

    const res = await request(ctx.app).patch(`/listings/${listing.id}`).set(bearer(admin)).send({ status: 'BLOCKED' });

    expect(res.status).toBe(200);
    expect(res.body.data.listing.status).toBe('BLOCKED');
  });
});
