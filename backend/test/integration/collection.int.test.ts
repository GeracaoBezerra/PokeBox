import request from 'supertest';

import { CARD_OUTSIDE_SEED } from './support/fakeTcgdex.js';
import { addItem, bearer, CHARIZARD, createListing, PROFESSOR_OAK } from './support/flows.js';
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
