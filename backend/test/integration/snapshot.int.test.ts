import request from 'supertest';

import { addItem, bearer, CHARIZARD, createListing, PROFESSOR_OAK } from './support/flows.js';
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

  test('cópia vencida responde na hora e é atualizada por trás (#192)', async () => {
    await request(ctx.app).get(`/cards/${CHARIZARD}`).expect(200);
    const prisma = ctx.container.infra.prisma;
    await prisma.$executeRaw`
      UPDATE "CardCache" SET data = jsonb_set(data::jsonb, '{name}', '"Charizard guardado"'), "updatedAt" = '2026-01-01'
      WHERE "cardId" = ${CHARIZARD} AND lang = 'en'`;
    const storedName = async () => {
      const row = await prisma.cardCache.findUniqueOrThrow({ where: { cardId_lang: { cardId: CHARIZARD, lang: 'en' } } });
      return (row.data as { name: string }).name;
    };

    const restarted = await startTestApp();
    try {
      const res = await request(restarted.app).get(`/cards/${CHARIZARD.toUpperCase()}`);

      expect(res.status).toBe(200);
      expect(res.body.data.card).toMatchObject({ id: CHARIZARD, name: 'Charizard guardado' });
      for (let attempt = 0; attempt < 50 && (await storedName()) !== 'Charizard'; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 20));
      }
      expect(await storedName()).toBe('Charizard');
    } finally {
      await restarted.close();
    }
  });

  test('carta com o detalhe guardado entra na coleção com a TCGdex fora (#192)', async () => {
    await request(ctx.app).get(`/cards/${PROFESSOR_OAK}`).expect(200);

    const restarted = await startTestApp();
    restarted.tcgdex.failWith(503);
    try {
      const user = await registerUser(restarted.app);
      const item = await addItem(restarted.app, user, { cardId: PROFESSOR_OAK, finish: 'NORMAL' });

      expect(item.card).toMatchObject({ id: PROFESSOR_OAK });
    } finally {
      await restarted.close();
    }
  });
});
