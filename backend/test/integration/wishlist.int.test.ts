import request from 'supertest';

import { addItem, bearer, CHARIZARD } from './support/flows.js';
import { registerUser, startTestApp, type TestApp } from './support/testApp.js';

let ctx: TestApp;

beforeAll(async () => {
  ctx = await startTestApp();
});

afterAll(() => ctx.close());

const BLASTOISE = 'base1-2';

describe('POST, GET e DELETE /wishlist', () => {
  test('adiciona, lista e remove', async () => {
    const user = await registerUser(ctx.app);

    const add = await request(ctx.app).post('/wishlist').set(bearer(user)).send({ cardId: BLASTOISE });
    const list = await request(ctx.app).get('/wishlist').set(bearer(user));

    expect(add.status).toBe(201);
    expect(list.body.data.items).toHaveLength(1);

    await request(ctx.app).delete(`/wishlist/${add.body.data.item.id}`).set(bearer(user)).expect(204);
    const after = await request(ctx.app).get('/wishlist').set(bearer(user));
    expect(after.body.data.items).toHaveLength(0);
  });

  test('RN-04: carta repetida → 409', async () => {
    const user = await registerUser(ctx.app);
    await request(ctx.app).post('/wishlist').set(bearer(user)).send({ cardId: BLASTOISE }).expect(201);

    const res = await request(ctx.app).post('/wishlist').set(bearer(user)).send({ cardId: BLASTOISE });

    expect(res.status).toBe(409);
  });

  test('RN-04: opportunities conta outro colecionador com a carta pública, e não conta a privada', async () => {
    const wisher = await registerUser(ctx.app);
    await request(ctx.app).post('/wishlist').set(bearer(wisher)).send({ cardId: BLASTOISE }).expect(201);
    const opportunities = async () => {
      const res = await request(ctx.app).get('/wishlist').set(bearer(wisher));
      return res.body.data.items[0].opportunities;
    };
    const before = await opportunities();

    const publicOwner = await registerUser(ctx.app);
    await addItem(ctx.app, publicOwner, { cardId: BLASTOISE, finish: 'HOLO' });
    const privateOwner = await registerUser(ctx.app);
    await addItem(ctx.app, privateOwner, { cardId: BLASTOISE, finish: 'HOLO', isPublic: false });

    expect(await opportunities()).toBe(before + 1);
  });
});

describe('RN-12: wishlist só do que falta', () => {
  test('carta que a pessoa tem → 409', async () => {
    const user = await registerUser(ctx.app);
    await addItem(ctx.app, user, { cardId: CHARIZARD });

    const res = await request(ctx.app).post('/wishlist').set(bearer(user)).send({ cardId: CHARIZARD });

    expect(res.status).toBe(409);
  });

  test('carta que a pessoa tem como privada → 409', async () => {
    const user = await registerUser(ctx.app);
    await addItem(ctx.app, user, { cardId: CHARIZARD, isPublic: false });

    const res = await request(ctx.app).post('/wishlist').set(bearer(user)).send({ cardId: CHARIZARD });

    expect(res.status).toBe(409);
  });

  test('item zerado não conta → 201', async () => {
    const user = await registerUser(ctx.app);
    const item = await addItem(ctx.app, user, { cardId: CHARIZARD });
    await request(ctx.app).patch(`/collection/${item.id}`).set(bearer(user)).send({ quantity: 0 }).expect(200);

    const res = await request(ctx.app).post('/wishlist').set(bearer(user)).send({ cardId: CHARIZARD });

    expect(res.status).toBe(201);
  });
});
