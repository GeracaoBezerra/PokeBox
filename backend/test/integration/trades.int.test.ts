import request from 'supertest';

import { acceptedOffer, addItem, bearer, CHARIZARD, createListing, createTrade, makeOffer, PROFESSOR_OAK } from './support/flows.js';
import { loginSeedUser, registerUser, startTestApp, type TestApp, type TestUser } from './support/testApp.js';

let ctx: TestApp;

beforeAll(async () => {
  ctx = await startTestApp();
});

afterAll(() => ctx.close());

async function collectionOf(user: TestUser) {
  const res = await request(ctx.app).get('/collection').set(bearer(user));
  return res.body.data.items as { id: string; quantity: number; available: number; card: { id: string } }[];
}

describe('POST /trades', () => {
  test('quem fez a oferta cria a troca; dono → 403', async () => {
    const owner = await registerUser(ctx.app);
    const proposer = await registerUser(ctx.app);
    const { offer } = await acceptedOffer(ctx.app, owner, proposer);

    const byOwner = await request(ctx.app).post('/trades').set(bearer(owner)).send({ offerId: offer.id });
    const trade = await createTrade(ctx.app, proposer, offer.id);

    expect(byOwner.status).toBe(403);
    expect(trade.status).toBe('PROPOSED');
  });

  test('oferta não aceita → 422; segunda troca da mesma oferta → 409', async () => {
    const owner = await registerUser(ctx.app);
    const proposer = await registerUser(ctx.app);
    const listing = await createListing(ctx.app, owner, (await addItem(ctx.app, owner)).id);
    const oak = await addItem(ctx.app, proposer, { cardId: PROFESSOR_OAK, finish: 'NORMAL' });
    const proposed = await makeOffer(ctx.app, proposer, listing.id, [{ collectionItemId: oak.id, quantity: 1 }]);

    const notAccepted = await request(ctx.app).post('/trades').set(bearer(proposer)).send({ offerId: proposed.id });
    expect(notAccepted.status).toBe(422);

    const other = await registerUser(ctx.app);
    const second = await registerUser(ctx.app);
    const { offer } = await acceptedOffer(ctx.app, other, second);
    await createTrade(ctx.app, second, offer.id);
    const again = await request(ctx.app).post('/trades').set(bearer(second)).send({ offerId: offer.id });
    expect(again.status).toBe(409);
  });

  test('RN-08: reserva as cartas dos dois lados e baixa o anúncio', async () => {
    const owner = await registerUser(ctx.app);
    const proposer = await registerUser(ctx.app);
    const { ownerItem, proposerItem, listing, offer } = await acceptedOffer(ctx.app, owner, proposer);

    await createTrade(ctx.app, proposer, offer.id);

    const ownerSide = (await collectionOf(owner)).find((item) => item.id === ownerItem.id);
    const proposerSide = (await collectionOf(proposer)).find((item) => item.id === proposerItem.id);
    const listingNow = await request(ctx.app).get(`/listings/${listing.id}`).set(bearer(owner));
    expect(ownerSide).toMatchObject({ quantity: 1, available: 0 });
    expect(proposerSide).toMatchObject({ quantity: 2, available: 0 });
    expect(listingNow.body.data.listing.status).toBe('CLOSED');

    const lower = await request(ctx.app).patch(`/collection/${proposerItem.id}`).set(bearer(proposer)).send({ quantity: 1 });
    const del = await request(ctx.app).delete(`/collection/${proposerItem.id}`).set(bearer(proposer));
    expect(lower.status).toBe(422);
    expect(del.status).toBe(409);
  });
});

describe('POST /trades/:id/accept (RN-07)', () => {
  test('as cartas trocam de dono e a recebida sai da wishlist (RN-11)', async () => {
    const owner = await registerUser(ctx.app);
    const proposer = await registerUser(ctx.app);
    await request(ctx.app).post('/wishlist').set(bearer(proposer)).send({ cardId: CHARIZARD }).expect(201);
    const { offer } = await acceptedOffer(ctx.app, owner, proposer);
    const trade = await createTrade(ctx.app, proposer, offer.id);

    const res = await request(ctx.app).post(`/trades/${trade.id}/accept`).set(bearer(owner));

    expect(res.status).toBe(200);
    expect(res.body.data.trade.status).toBe('ACCEPTED');

    const ownerCards = await collectionOf(owner);
    const proposerCards = await collectionOf(proposer);
    const quantityOf = (items: typeof ownerCards, cardId: string) =>
      items.filter((item) => item.card.id === cardId).reduce((sum, item) => sum + item.quantity, 0);
    expect(quantityOf(ownerCards, CHARIZARD)).toBe(0);
    expect(quantityOf(ownerCards, PROFESSOR_OAK)).toBe(2);
    expect(quantityOf(proposerCards, CHARIZARD)).toBe(1);
    expect(quantityOf(proposerCards, PROFESSOR_OAK)).toBe(0);

    const wishlist = await request(ctx.app).get('/wishlist').set(bearer(proposer));
    expect(wishlist.body.data.items).toHaveLength(0);
  });

  test('só o dono do anúncio conclui (403) e troca finalizada não muda mais (409)', async () => {
    const owner = await registerUser(ctx.app);
    const proposer = await registerUser(ctx.app);
    const { offer } = await acceptedOffer(ctx.app, owner, proposer);
    const trade = await createTrade(ctx.app, proposer, offer.id);

    await request(ctx.app).post(`/trades/${trade.id}/accept`).set(bearer(proposer)).expect(403);
    await request(ctx.app).post(`/trades/${trade.id}/accept`).set(bearer(owner)).expect(200);
    await request(ctx.app).post(`/trades/${trade.id}/accept`).set(bearer(owner)).expect(409);
    await request(ctx.app).post(`/trades/${trade.id}/cancel`).set(bearer(proposer)).expect(409);
  });
});

describe('recusar, cancelar e ver a troca', () => {
  test('recusar libera a reserva', async () => {
    const owner = await registerUser(ctx.app);
    const proposer = await registerUser(ctx.app);
    const { proposerItem, offer } = await acceptedOffer(ctx.app, owner, proposer);
    const trade = await createTrade(ctx.app, proposer, offer.id);

    const res = await request(ctx.app).post(`/trades/${trade.id}/reject`).set(bearer(owner));
    const proposerSide = (await collectionOf(proposer)).find((item) => item.id === proposerItem.id);

    expect(res.status).toBe(200);
    expect(proposerSide).toMatchObject({ quantity: 2, available: 2 });
  });

  test('quem fez a oferta cancela', async () => {
    const owner = await registerUser(ctx.app);
    const proposer = await registerUser(ctx.app);
    const { offer } = await acceptedOffer(ctx.app, owner, proposer);
    const trade = await createTrade(ctx.app, proposer, offer.id);

    const res = await request(ctx.app).post(`/trades/${trade.id}/cancel`).set(bearer(proposer));

    expect(res.status).toBe(200);
    expect(res.body.data.trade.status).toBe('CANCELED');
  });

  test('GET /trades/:id: as duas partes veem; terceiro e ADMIN → 403', async () => {
    const owner = await registerUser(ctx.app);
    const proposer = await registerUser(ctx.app);
    const stranger = await registerUser(ctx.app);
    const admin = await loginSeedUser(ctx.app, 'admin');
    const { offer } = await acceptedOffer(ctx.app, owner, proposer);
    const trade = await createTrade(ctx.app, proposer, offer.id);

    await request(ctx.app).get(`/trades/${trade.id}`).set(bearer(owner)).expect(200);
    await request(ctx.app).get(`/trades/${trade.id}`).set(bearer(proposer)).expect(200);
    await request(ctx.app).get(`/trades/${trade.id}`).set(bearer(stranger)).expect(403);
    await request(ctx.app).get(`/trades/${trade.id}`).set(bearer(admin)).expect(403);
  });

  test('GET /trades/me separa enviadas e recebidas', async () => {
    const owner = await registerUser(ctx.app);
    const proposer = await registerUser(ctx.app);
    const { offer } = await acceptedOffer(ctx.app, owner, proposer);
    const trade = await createTrade(ctx.app, proposer, offer.id);

    const mine = await request(ctx.app).get('/trades/me').set(bearer(proposer));
    const theirs = await request(ctx.app).get('/trades/me').set(bearer(owner));

    expect(mine.body.data.sent.map((t: { id: string }) => t.id)).toEqual([trade.id]);
    expect(theirs.body.data.received.map((t: { id: string }) => t.id)).toEqual([trade.id]);
  });
});
