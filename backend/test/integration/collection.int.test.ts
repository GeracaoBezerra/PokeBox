import request from 'supertest';

import { CARD_OUTSIDE_SEED } from './support/fakeTcgdex.js';
import { acceptedOffer, addItem, bearer, CHARIZARD, createListing, makeOffer, PROFESSOR_OAK } from './support/flows.js';
import { registerUser, startTestApp, type TestApp } from './support/testApp.js';

let ctx: TestApp;

beforeAll(async () => {
  ctx = await startTestApp();
});

afterAll(() => ctx.close());

const MISSING_ID = '00000000-0000-4000-8000-000000000000';

describe('POST e GET /collection', () => {
  test('adiciona a carta e ela aparece na coleção com available', async () => {
    const user = await registerUser(ctx.app);

    const item = await addItem(ctx.app, user, { quantity: 3 });
    const res = await request(ctx.app).get('/collection').set(bearer(user));

    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(1);
    expect(res.body.data.items[0]).toMatchObject({ id: item.id, quantity: 3, available: 3 });
  });

  test('RN-01: a carta que não estava no banco é gravada na tabela Card uma vez, e os dois donos apontam para ela', async () => {
    const prisma = ctx.container.infra.prisma;
    const ash = await registerUser(ctx.app);
    const misty = await registerUser(ctx.app);
    const card = { cardId: CARD_OUTSIDE_SEED.id, finish: 'NORMAL' as const };
    await expect(prisma.card.findUnique({ where: { id: CARD_OUTSIDE_SEED.id } })).resolves.toBeNull();

    await addItem(ctx.app, ash, card);
    const saved = await prisma.card.findUnique({ where: { id: CARD_OUTSIDE_SEED.id } });
    await addItem(ctx.app, misty, card);

    expect(saved).toMatchObject({ name: 'Testemon', setName: 'Integração', number: '1/1', rarity: 'Rare' });
    const snapshots = await Promise.all(
      [ash, misty].map(async (user) => (await request(ctx.app).get('/collection').set(bearer(user))).body.data.items[0].card),
    );
    expect(snapshots[0]).toMatchObject({ id: CARD_OUTSIDE_SEED.id, name: 'Testemon' });
    expect(snapshots[1]).toEqual(snapshots[0]);
  });

  test('RN-03: mesma carta, condição e variante soma na quantidade', async () => {
    const user = await registerUser(ctx.app);

    const first = await addItem(ctx.app, user, { quantity: 1 });
    const second = await addItem(ctx.app, user, { quantity: 2 });

    expect(second.id).toBe(first.id);
    expect(second.quantity).toBe(3);
  });

  test('variante que a carta não tem → 422', async () => {
    const user = await registerUser(ctx.app);

    const res = await request(ctx.app)
      .post('/collection')
      .set(bearer(user))
      .send({ cardId: PROFESSOR_OAK, quantity: 1, finish: 'HOLO', firstEdition: false });

    expect(res.status).toBe(422);
  });

  test('carta que não existe na TCGdex → 404', async () => {
    const user = await registerUser(ctx.app);

    const res = await request(ctx.app)
      .post('/collection')
      .set(bearer(user))
      .send({ cardId: 'nao-existe-1', quantity: 1, finish: 'NORMAL', firstEdition: false });

    expect(res.status).toBe(404);
  });

  test('RN-03: quantidade negativa → 400 com details', async () => {
    const user = await registerUser(ctx.app);

    const res = await request(ctx.app)
      .post('/collection')
      .set(bearer(user))
      .send({ cardId: CHARIZARD, quantity: -1, finish: 'HOLO', firstEdition: false });

    expect(res.status).toBe(400);
    expect(res.body.details).toEqual(expect.arrayContaining([expect.objectContaining({ field: 'quantity' })]));
  });

  test('RN-03: o CHECK do banco barra quantidade negativa mesmo fora da API', async () => {
    const user = await registerUser(ctx.app);
    const item = await addItem(ctx.app, user);

    await expect(
      ctx.container.infra.prisma.collectionItem.update({ where: { id: item.id }, data: { quantity: -1 } }),
    ).rejects.toThrow();
  });
});

describe('RN-02: dono do item', () => {
  test('outra pessoa não edita nem apaga (403); item inexistente → 404', async () => {
    const owner = await registerUser(ctx.app);
    const intruder = await registerUser(ctx.app);
    const item = await addItem(ctx.app, owner);

    const patch = await request(ctx.app).patch(`/collection/${item.id}`).set(bearer(intruder)).send({ quantity: 5 });
    const del = await request(ctx.app).delete(`/collection/${item.id}`).set(bearer(intruder));
    const missing = await request(ctx.app).patch(`/collection/${MISSING_ID}`).set(bearer(owner)).send({ quantity: 5 });

    expect(patch.status).toBe(403);
    expect(patch.body.success).toBe(false);
    expect(del.status).toBe(403);
    expect(missing.status).toBe(404);
  });
});

describe('PATCH e DELETE /collection/:id', () => {
  test('dono muda quantidade e visibilidade', async () => {
    const user = await registerUser(ctx.app);
    const item = await addItem(ctx.app, user);

    const res = await request(ctx.app)
      .patch(`/collection/${item.id}`)
      .set(bearer(user))
      .send({ quantity: 4, isPublic: false });

    expect(res.status).toBe(200);
    expect(res.body.data.item).toMatchObject({ quantity: 4, isPublic: false });
  });

  test('dono apaga item sem negociação → 204', async () => {
    const user = await registerUser(ctx.app);
    const item = await addItem(ctx.app, user);

    await request(ctx.app).delete(`/collection/${item.id}`).set(bearer(user)).expect(204);
    const res = await request(ctx.app).get('/collection').set(bearer(user));

    expect(res.body.data.items).toHaveLength(0);
  });

  test('RN-05: não baixa a quantidade abaixo do anunciado (422) nem apaga item já anunciado (409)', async () => {
    const user = await registerUser(ctx.app);
    const item = await addItem(ctx.app, user, { quantity: 3 });
    await createListing(ctx.app, user, item.id, 2);

    const patch = await request(ctx.app).patch(`/collection/${item.id}`).set(bearer(user)).send({ quantity: 1 });
    const del = await request(ctx.app).delete(`/collection/${item.id}`).set(bearer(user));

    expect(patch.status).toBe(422);
    expect(del.status).toBe(409);
  });

  test('RN-08: condição não muda com o item num anúncio aberto (409)', async () => {
    const user = await registerUser(ctx.app);
    const item = await addItem(ctx.app, user);
    await createListing(ctx.app, user, item.id);

    const res = await request(ctx.app).patch(`/collection/${item.id}`).set(bearer(user)).send({ condition: 'POOR' });

    expect(res.status).toBe(409);
  });
});

describe('RN-11: coleção limpa a wishlist', () => {
  test('POST /collection de carta da wishlist devolve removedFromWishlist e ela sai da wishlist', async () => {
    const user = await registerUser(ctx.app);
    await request(ctx.app).post('/wishlist').set(bearer(user)).send({ cardId: CHARIZARD }).expect(201);

    const res = await request(ctx.app)
      .post('/collection')
      .set(bearer(user))
      .send({ cardId: CHARIZARD, quantity: 1, finish: 'HOLO', firstEdition: false });
    const wishlist = await request(ctx.app).get('/wishlist').set(bearer(user));

    expect(res.status).toBe(201);
    expect(res.body.data.removedFromWishlist).toBe(true);
    expect(wishlist.body.data.items).toHaveLength(0);
  });

  test('carta que não estava na wishlist → removedFromWishlist false', async () => {
    const user = await registerUser(ctx.app);

    const res = await request(ctx.app)
      .post('/collection')
      .set(bearer(user))
      .send({ cardId: CHARIZARD, quantity: 1, finish: 'HOLO', firstEdition: false });

    expect(res.body.data.removedFromWishlist).toBe(false);
  });

  test('item zerado que volta a ter quantidade tira a carta da wishlist', async () => {
    const user = await registerUser(ctx.app);
    const item = await addItem(ctx.app, user);
    await request(ctx.app).patch(`/collection/${item.id}`).set(bearer(user)).send({ quantity: 0 }).expect(200);
    await request(ctx.app).post('/wishlist').set(bearer(user)).send({ cardId: CHARIZARD }).expect(201);

    await request(ctx.app).patch(`/collection/${item.id}`).set(bearer(user)).send({ quantity: 1 }).expect(200);
    const wishlist = await request(ctx.app).get('/wishlist').set(bearer(user));

    expect(wishlist.body.data.items).toHaveLength(0);
  });
});

describe('GET /collection/summary', () => {
  test('soma unidades, conta cartas diferentes com quantidade e itens com anúncio aberto', async () => {
    const user = await registerUser(ctx.app);
    const charizard = await addItem(ctx.app, user, { quantity: 2 });
    await addItem(ctx.app, user, { quantity: 1, condition: 'POOR' });
    const oak = await addItem(ctx.app, user, { cardId: PROFESSOR_OAK, finish: 'NORMAL', quantity: 3 });
    await createListing(ctx.app, user, charizard.id);
    await request(ctx.app).patch(`/collection/${oak.id}`).set(bearer(user)).send({ quantity: 0 }).expect(200);

    const res = await request(ctx.app).get('/collection/summary').set(bearer(user));

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: { totalUnits: 3, distinctCards: 1, listedItems: 1 } });
  });

  test('coleção vazia devolve zeros e não mistura a coleção de outra pessoa', async () => {
    const user = await registerUser(ctx.app);
    const other = await registerUser(ctx.app);
    await addItem(ctx.app, other, { quantity: 5 });

    const res = await request(ctx.app).get('/collection/summary').set(bearer(user));

    expect(res.body.data).toEqual({ totalUnits: 0, distinctCards: 0, listedItems: 0 });
  });

  test('sem login → 401', async () => {
    await request(ctx.app).get('/collection/summary').expect(401);
  });
});

describe('GET /collection: deleteBlockedBy e withZero', () => {
  async function blockOf(user: Parameters<typeof bearer>[0], itemId: string, query = '') {
    const res = await request(ctx.app).get(`/collection${query}`).set(bearer(user)).expect(200);
    return res.body.data.items.find((item: { id: string }) => item.id === itemId)?.deleteBlockedBy;
  }

  test('item livre vem com null, na lista inteira e na paginada', async () => {
    const user = await registerUser(ctx.app);
    const item = await addItem(ctx.app, user);

    expect(await blockOf(user, item.id)).toBeNull();
    expect(await blockOf(user, item.id, '?page=1')).toBeNull();
  });

  test('item reservado numa troca → RESERVED, e o DELETE recusa', async () => {
    const owner = await registerUser(ctx.app);
    const proposer = await registerUser(ctx.app);
    const { ownerItem, proposerItem } = await acceptedOffer(ctx.app, owner, proposer);

    expect(await blockOf(owner, ownerItem.id)).toBe('RESERVED');
    expect(await blockOf(proposer, proposerItem.id, '?page=1')).toBe('RESERVED');
    await request(ctx.app).delete(`/collection/${proposerItem.id}`).set(bearer(proposer)).expect(409);
  });

  test('item com anúncio aberto → OPEN_LISTING; fechado o anúncio → LISTING_HISTORY', async () => {
    const user = await registerUser(ctx.app);
    const item = await addItem(ctx.app, user);
    const listing = await createListing(ctx.app, user, item.id);

    expect(await blockOf(user, item.id)).toBe('OPEN_LISTING');

    await request(ctx.app).patch(`/listings/${listing.id}`).set(bearer(user)).send({ status: 'CLOSED' }).expect(200);

    expect(await blockOf(user, item.id)).toBe('LISTING_HISTORY');
    await request(ctx.app).delete(`/collection/${item.id}`).set(bearer(user)).expect(409);
  });

  test('item numa oferta aberta → OPEN_OFFER, e o DELETE recusa', async () => {
    const owner = await registerUser(ctx.app);
    const proposer = await registerUser(ctx.app);
    const ownerItem = await addItem(ctx.app, owner);
    const listing = await createListing(ctx.app, owner, ownerItem.id);
    const offered = await addItem(ctx.app, proposer, { cardId: PROFESSOR_OAK, finish: 'NORMAL' });
    await makeOffer(ctx.app, proposer, listing.id, [{ collectionItemId: offered.id, quantity: 1 }]);

    expect(await blockOf(proposer, offered.id)).toBe('OPEN_OFFER');
    await request(ctx.app).delete(`/collection/${offered.id}`).set(bearer(proposer)).expect(409);
  });

  test('withZero=false esconde os itens zerados; sem o filtro eles aparecem', async () => {
    const user = await registerUser(ctx.app);
    const kept = await addItem(ctx.app, user);
    const zeroed = await addItem(ctx.app, user, { cardId: PROFESSOR_OAK, finish: 'NORMAL' });
    await request(ctx.app).patch(`/collection/${zeroed.id}`).set(bearer(user)).send({ quantity: 0 }).expect(200);

    const filtered = await request(ctx.app).get('/collection?withZero=false').set(bearer(user));
    const all = await request(ctx.app).get('/collection').set(bearer(user));

    expect(filtered.body.data.items.map((item: { id: string }) => item.id)).toEqual([kept.id]);
    expect(all.body.data.items).toHaveLength(2);
  });

  test('o perfil público não expõe deleteBlockedBy', async () => {
    const user = await registerUser(ctx.app);
    await addItem(ctx.app, user);

    const res = await request(ctx.app).get(`/users/${user.username}/collection`);

    expect(res.status).toBe(200);
    expect(res.body.data.items[0]).not.toHaveProperty('deleteBlockedBy');
  });
});
