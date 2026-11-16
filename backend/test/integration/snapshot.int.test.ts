import request from 'supertest';

import { addItem, bearer, CHARIZARD, createListing } from './support/flows.js';
import { registerUser, startTestApp, type TestApp } from './support/testApp.js';

let ctx: TestApp;

beforeAll(async () => {
  ctx = await startTestApp();
});

afterAll(() => ctx.close());

const BLASTOISE = 'base1-2';

describe('RN-09: snapshot local da carta', () => {
  test('TCGdex fora do ar não quebra coleção, wishlist, perfil público nem marketplace', async () => {
    const user = await registerUser(ctx.app);
    const item = await addItem(ctx.app, user, { cardId: CHARIZARD });
    await createListing(ctx.app, user, item.id);
    await request(ctx.app).post('/wishlist').set(bearer(user)).send({ cardId: BLASTOISE }).expect(201);

    ctx.tcgdex.failWith(500);
    try {
      const collection = await request(ctx.app).get('/collection').set(bearer(user));
      const wishlist = await request(ctx.app).get('/wishlist').set(bearer(user));
      const profile = await request(ctx.app).get(`/users/${user.username}/collection`);
      const marketplace = await request(ctx.app).get('/listings').query({ username: user.username });

      expect(collection.status).toBe(200);
      expect(collection.body.data.items[0].card).toMatchObject({
        id: CHARIZARD,
        name: 'Charizard',
        setName: 'Base Set',
        number: '4/102',
        rarity: 'Rare',
        imageUrl: expect.stringContaining('base1/4'),
      });
      expect(wishlist.status).toBe(200);
      expect(wishlist.body.data.items[0].card).toMatchObject({ id: BLASTOISE, name: 'Blastoise' });
      expect(profile.status).toBe(200);
      expect(JSON.stringify(profile.body)).toContain('Charizard');
      expect(marketplace.status).toBe(200);
      expect(marketplace.body.data.items[0].card).toMatchObject({ id: CHARIZARD, name: 'Charizard' });
    } finally {
      ctx.tcgdex.failWith(null);
    }
  });

  test('detalhe da carta já consultada sai da cópia guardada no banco quando a TCGdex cai', async () => {
    await request(ctx.app).get(`/cards/${CHARIZARD}`).expect(200);

    const restarted = await startTestApp();
    restarted.tcgdex.failWith(500);
    try {
      const res = await request(restarted.app).get(`/cards/${CHARIZARD}`);

      expect(res.status).toBe(200);
      expect(res.body.data.card).toMatchObject({ id: CHARIZARD, name: 'Charizard' });
    } finally {
      await restarted.close();
    }
  });
});
