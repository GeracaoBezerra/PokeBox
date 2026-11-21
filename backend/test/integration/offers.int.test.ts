import request from 'supertest';

import { acceptedOffer, addItem, bearer, createListing, makeOffer, PROFESSOR_OAK } from './support/flows.js';
import { loginSeedUser, registerUser, startTestApp, type TestApp, type TestUser } from './support/testApp.js';

let ctx: TestApp;

beforeAll(async () => {
  ctx = await startTestApp();
});

afterAll(() => ctx.close());

async function openListing(owner: TestUser) {
  return createListing(ctx.app, owner, (await addItem(ctx.app, owner)).id);
}

async function oakOf(user: TestUser, quantity = 2) {
  return addItem(ctx.app, user, { cardId: PROFESSOR_OAK, finish: 'NORMAL', quantity });
}

describe('POST /listings/:id/offers (RN-06)', () => {
  test('oferta em anúncio ativo de outra pessoa → 201 PROPOSED', async () => {
    const owner = await registerUser(ctx.app);
    const proposer = await registerUser(ctx.app);
    const listing = await openListing(owner);
    const oak = await oakOf(proposer);

    const offer = await makeOffer(ctx.app, proposer, listing.id, [{ collectionItemId: oak.id, quantity: 1 }]);

    expect(offer.status).toBe('PROPOSED');
  });

  test('no próprio anúncio → 422', async () => {
    const owner = await registerUser(ctx.app);
    const listing = await openListing(owner);
    const oak = await oakOf(owner);

    const res = await request(ctx.app)
      .post(`/listings/${listing.id}/offers`)
      .set(bearer(owner))
      .send({ quantity: 1, items: [{ collectionItemId: oak.id, quantity: 1 }] });

    expect(res.status).toBe(422);
  });

  test('anúncio pausado → 404', async () => {
    const owner = await registerUser(ctx.app);
    const proposer = await registerUser(ctx.app);
    const listing = await openListing(owner);
    await request(ctx.app).patch(`/listings/${listing.id}`).set(bearer(owner)).send({ status: 'PAUSED' }).expect(200);
    const oak = await oakOf(proposer);

    const res = await request(ctx.app)
      .post(`/listings/${listing.id}/offers`)
      .set(bearer(proposer))
      .send({ quantity: 1, items: [{ collectionItemId: oak.id, quantity: 1 }] });

    expect(res.status).toBe(404);
  });

  test('carta de outra pessoa → 403; mais do que tem → 422', async () => {
    const owner = await registerUser(ctx.app);
    const proposer = await registerUser(ctx.app);
    const listing = await openListing(owner);
    const othersOak = await oakOf(owner);
    const myOak = await oakOf(proposer, 1);

    const notMine = await request(ctx.app)
      .post(`/listings/${listing.id}/offers`)
      .set(bearer(proposer))
      .send({ quantity: 1, items: [{ collectionItemId: othersOak.id, quantity: 1 }] });
    const tooMany = await request(ctx.app)
      .post(`/listings/${listing.id}/offers`)
      .set(bearer(proposer))
      .send({ quantity: 1, items: [{ collectionItemId: myOak.id, quantity: 5 }] });

    expect(notMine.status).toBe(403);
    expect(tooMany.status).toBe(422);
  });

  test('segunda oferta aberta no mesmo anúncio → 409', async () => {
    const owner = await registerUser(ctx.app);
    const proposer = await registerUser(ctx.app);
    const listing = await openListing(owner);
    const oak = await oakOf(proposer);
    await makeOffer(ctx.app, proposer, listing.id, [{ collectionItemId: oak.id, quantity: 1 }]);

    const res = await request(ctx.app)
      .post(`/listings/${listing.id}/offers`)
      .set(bearer(proposer))
      .send({ quantity: 1, items: [{ collectionItemId: oak.id, quantity: 1 }] });

    expect(res.status).toBe(409);
  });
});

describe('PATCH /offers/:id/status (RN-06)', () => {
  test('só o dono aceita e só quem fez cancela (403)', async () => {
    const owner = await registerUser(ctx.app);
    const proposer = await registerUser(ctx.app);
    const listing = await openListing(owner);
    const offer = await makeOffer(ctx.app, proposer, listing.id, [{ collectionItemId: (await oakOf(proposer)).id, quantity: 1 }]);

    const proposerAccepts = await request(ctx.app).patch(`/offers/${offer.id}/status`).set(bearer(proposer)).send({ status: 'ACCEPTED' });
    const ownerCancels = await request(ctx.app).patch(`/offers/${offer.id}/status`).set(bearer(owner)).send({ status: 'CANCELED' });

    expect(proposerAccepts.status).toBe(403);
    expect(ownerCancels.status).toBe(403);
  });

  test('oferta finalizada não volta para PROPOSED nem muda de novo (422)', async () => {
    const owner = await registerUser(ctx.app);
    const proposer = await registerUser(ctx.app);
    const listing = await openListing(owner);
    const offer = await makeOffer(ctx.app, proposer, listing.id, [{ collectionItemId: (await oakOf(proposer)).id, quantity: 1 }]);
    await request(ctx.app).patch(`/offers/${offer.id}/status`).set(bearer(owner)).send({ status: 'REJECTED' }).expect(200);

    const back = await request(ctx.app).patch(`/offers/${offer.id}/status`).set(bearer(owner)).send({ status: 'PROPOSED' });
    const again = await request(ctx.app).patch(`/offers/${offer.id}/status`).set(bearer(owner)).send({ status: 'ACCEPTED' });

    expect(back.status).toBe(400);
    expect(again.status).toBe(422);
  });

  test('fechar o anúncio cancela as ofertas abertas com o motivo anúncio fechado', async () => {
    const owner = await registerUser(ctx.app);
    const proposer = await registerUser(ctx.app);
    const listing = await openListing(owner);
    const offer = await makeOffer(ctx.app, proposer, listing.id, [{ collectionItemId: (await oakOf(proposer)).id, quantity: 1 }]);

    await request(ctx.app).patch(`/listings/${listing.id}`).set(bearer(owner)).send({ status: 'CLOSED' }).expect(200);
    const res = await request(ctx.app).get(`/offers/${offer.id}`).set(bearer(proposer));

    expect(res.body.data.offer).toMatchObject({ status: 'CANCELED', cancelReason: 'LISTING_CLOSED', onHold: false });
  });

  test('bloquear o anúncio (ADMIN) cancela as abertas com o motivo anúncio bloqueado', async () => {
    const owner = await registerUser(ctx.app);
    const proposer = await registerUser(ctx.app);
    const admin = await loginSeedUser(ctx.app, 'admin');
    const listing = await openListing(owner);
    const offer = await makeOffer(ctx.app, proposer, listing.id, [{ collectionItemId: (await oakOf(proposer)).id, quantity: 1 }]);

    await request(ctx.app).patch(`/listings/${listing.id}`).set(bearer(admin)).send({ status: 'BLOCKED' }).expect(200);
    const res = await request(ctx.app).get(`/offers/${offer.id}`).set(bearer(proposer));

    expect(res.body.data.offer).toMatchObject({ status: 'CANCELED', cancelReason: 'LISTING_BLOCKED' });
  });

  test('anúncio em troca não recebe oferta nova (422)', async () => {
    const owner = await registerUser(ctx.app);
    const proposer = await registerUser(ctx.app);
    const late = await registerUser(ctx.app);
    const { listing } = await acceptedOffer(ctx.app, owner, proposer);

    const res = await request(ctx.app)
      .post(`/listings/${listing.id}/offers`)
      .set(bearer(late))
      .send({ quantity: 1, items: [{ collectionItemId: (await oakOf(late)).id, quantity: 1 }] });

    expect(res.status).toBe(422);
  });
});

describe('GET /offers', () => {
  test('GET /offers/me separa enviadas e recebidas', async () => {
    const owner = await registerUser(ctx.app);
    const proposer = await registerUser(ctx.app);
    const listing = await openListing(owner);
    const offer = await makeOffer(ctx.app, proposer, listing.id, [{ collectionItemId: (await oakOf(proposer)).id, quantity: 1 }]);

    const mine = await request(ctx.app).get('/offers/me').set(bearer(proposer));
    const theirs = await request(ctx.app).get('/offers/me').set(bearer(owner));

    expect(mine.body.data.sent.map((o: { id: string }) => o.id)).toEqual([offer.id]);
    expect(theirs.body.data.received.map((o: { id: string }) => o.id)).toEqual([offer.id]);
  });

  test('GET /offers/:id: terceiro e ADMIN → 404', async () => {
    const owner = await registerUser(ctx.app);
    const proposer = await registerUser(ctx.app);
    const stranger = await registerUser(ctx.app);
    const admin = await loginSeedUser(ctx.app, 'admin');
    const listing = await openListing(owner);
    const offer = await makeOffer(ctx.app, proposer, listing.id, [{ collectionItemId: (await oakOf(proposer)).id, quantity: 1 }]);

    await request(ctx.app).get(`/offers/${offer.id}`).set(bearer(owner)).expect(200);
    await request(ctx.app).get(`/offers/${offer.id}`).set(bearer(stranger)).expect(404);
    await request(ctx.app).get(`/offers/${offer.id}`).set(bearer(admin)).expect(404);
  });

  test('carta numa oferta aberta não pode ser apagada da coleção (409)', async () => {
    const owner = await registerUser(ctx.app);
    const proposer = await registerUser(ctx.app);
    const listing = await openListing(owner);
    const oak = await oakOf(proposer);
    await makeOffer(ctx.app, proposer, listing.id, [{ collectionItemId: oak.id, quantity: 1 }]);

    await request(ctx.app).delete(`/collection/${oak.id}`).set(bearer(proposer)).expect(409);
  });

  test('oferta recusada guarda as cartas oferecidas, mesmo depois de o item sair da coleção', async () => {
    const owner = await registerUser(ctx.app);
    const proposer = await registerUser(ctx.app);
    const listing = await openListing(owner);
    const oak = await oakOf(proposer);
    const offer = await makeOffer(ctx.app, proposer, listing.id, [{ collectionItemId: oak.id, quantity: 1 }]);

    await request(ctx.app).patch(`/offers/${offer.id}/status`).set(bearer(owner)).send({ status: 'REJECTED' }).expect(200);
    await request(ctx.app).delete(`/collection/${oak.id}`).set(bearer(proposer)).expect(204);

    const after = (await request(ctx.app).get(`/offers/${offer.id}`).set(bearer(owner))).body.data.offer;
    expect(after.status).toBe('REJECTED');
    expect(after.items).toEqual([
      expect.objectContaining({ collectionItemId: null, quantity: 1, card: expect.objectContaining({ id: PROFESSOR_OAK }) }),
    ]);
  });
});
