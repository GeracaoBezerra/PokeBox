import request from 'supertest';

import {
  acceptedOffer,
  addItem,
  bearer,
  CHARIZARD,
  confirmTrade,
  createListing,
  makeOffer,
  PROFESSOR_OAK,
} from './support/flows.js';
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

async function listingOf(user: TestUser, id: string) {
  const res = await request(ctx.app).get(`/listings/${id}`).set(bearer(user));
  return res.body.data.listing as { status: string; quantity: number };
}

describe('aceitar a oferta cria a troca (RN-06, RN-08)', () => {
  test('a resposta traz o tradeId; reserva os dois lados e o anúncio vira Em troca', async () => {
    const owner = await registerUser(ctx.app);
    const proposer = await registerUser(ctx.app);
    const { ownerItem, proposerItem, listing, offer, tradeId } = await acceptedOffer(ctx.app, owner, proposer);

    const trade = await request(ctx.app).get(`/trades/${tradeId}`).set(bearer(owner));

    expect(offer).toMatchObject({ status: 'ACCEPTED', tradeId: expect.any(String), onHold: false, cancelReason: null });
    expect(trade.body.data.trade).toMatchObject({
      status: 'PROPOSED',
      offerId: offer.id,
      proposerConfirmedAt: null,
      recipientConfirmedAt: null,
    });
    expect((await collectionOf(owner)).find((item) => item.id === ownerItem.id)).toMatchObject({ quantity: 1, available: 0 });
    expect((await collectionOf(proposer)).find((item) => item.id === proposerItem.id)).toMatchObject({
      quantity: 2,
      available: 0,
    });
    expect(await listingOf(owner, listing.id)).toMatchObject({ status: 'IN_TRADE', quantity: 0 });
  });

  test('cartas indisponíveis: 422 e nada muda (oferta aberta, sem troca, anúncio ativo)', async () => {
    const owner = await registerUser(ctx.app);
    const proposer = await registerUser(ctx.app);
    const listing = await createListing(ctx.app, owner, (await addItem(ctx.app, owner)).id);
    const oak = await addItem(ctx.app, proposer, { cardId: PROFESSOR_OAK, finish: 'NORMAL', quantity: 2 });
    const offer = await makeOffer(ctx.app, proposer, listing.id, [{ collectionItemId: oak.id, quantity: 2 }]);
    await request(ctx.app).patch(`/collection/${oak.id}`).set(bearer(proposer)).send({ quantity: 1 }).expect(200);

    const res = await request(ctx.app).patch(`/offers/${offer.id}/status`).set(bearer(owner)).send({ status: 'ACCEPTED' });
    const after = await request(ctx.app).get(`/offers/${offer.id}`).set(bearer(owner));
    const trades = await request(ctx.app).get('/trades/me').set(bearer(owner));

    expect(res.status).toBe(422);
    expect(after.body.data.offer).toMatchObject({ status: 'PROPOSED', tradeId: null });
    expect(trades.body.data.received).toEqual([]);
    expect(await listingOf(owner, listing.id)).toMatchObject({ status: 'ACTIVE', quantity: 1 });
  });

  test('oferta aceita não muda mais (409)', async () => {
    const owner = await registerUser(ctx.app);
    const proposer = await registerUser(ctx.app);
    const { offer } = await acceptedOffer(ctx.app, owner, proposer);

    await request(ctx.app).patch(`/offers/${offer.id}/status`).set(bearer(owner)).send({ status: 'REJECTED' }).expect(409);
    await request(ctx.app).patch(`/offers/${offer.id}/status`).set(bearer(proposer)).send({ status: 'CANCELED' }).expect(409);
  });

  test('outras ofertas do anúncio ficam em espera: aceitar dá 422, quem ofertou cancela', async () => {
    const owner = await registerUser(ctx.app);
    const first = await registerUser(ctx.app);
    const second = await registerUser(ctx.app);
    const listing = await createListing(ctx.app, owner, (await addItem(ctx.app, owner)).id);
    const offerFrom = async (user: TestUser) => {
      const oak = await addItem(ctx.app, user, { cardId: PROFESSOR_OAK, finish: 'NORMAL' });
      return makeOffer(ctx.app, user, listing.id, [{ collectionItemId: oak.id, quantity: 1 }]);
    };
    const winner = await offerFrom(first);
    const waiting = await offerFrom(second);
    await request(ctx.app).patch(`/offers/${winner.id}/status`).set(bearer(owner)).send({ status: 'ACCEPTED' }).expect(200);

    const held = await request(ctx.app).get(`/offers/${waiting.id}`).set(bearer(second));
    const accept = await request(ctx.app).patch(`/offers/${waiting.id}/status`).set(bearer(owner)).send({ status: 'ACCEPTED' });
    const cancel = await request(ctx.app).patch(`/offers/${waiting.id}/status`).set(bearer(second)).send({ status: 'CANCELED' });

    expect(held.body.data.offer).toMatchObject({ status: 'PROPOSED', onHold: true });
    expect(accept.status).toBe(422);
    expect(accept.body.error).toMatch(/em espera/);
    expect(cancel.body.data.offer).toMatchObject({ status: 'CANCELED', cancelReason: 'PROPOSER' });
  });
});

describe('POST /trades (rota do PDF)', () => {
  test('oferta que já virou troca → 409; dono → 403; oferta não aceita → 422', async () => {
    const owner = await registerUser(ctx.app);
    const proposer = await registerUser(ctx.app);
    const { offer } = await acceptedOffer(ctx.app, owner, proposer);
    const listing = await createListing(ctx.app, owner, (await addItem(ctx.app, owner, { cardId: PROFESSOR_OAK, finish: 'NORMAL' })).id);
    const charizard = await addItem(ctx.app, proposer);
    const proposed = await makeOffer(ctx.app, proposer, listing.id, [{ collectionItemId: charizard.id, quantity: 1 }]);

    await request(ctx.app).post('/trades').set(bearer(proposer)).send({ offerId: offer.id }).expect(409);
    await request(ctx.app).post('/trades').set(bearer(owner)).send({ offerId: offer.id }).expect(403);
    await request(ctx.app).post('/trades').set(bearer(proposer)).send({ offerId: proposed.id }).expect(422);
  });
});

describe('POST /trades/:id/accept: as duas partes confirmam (RN-07)', () => {
  test('a primeira confirmação só grava a data; a segunda troca as cartas e tira da wishlist (RN-11)', async () => {
    const owner = await registerUser(ctx.app);
    const proposer = await registerUser(ctx.app);
    await request(ctx.app).post('/wishlist').set(bearer(proposer)).send({ cardId: CHARIZARD }).expect(201);
    const { listing, tradeId } = await acceptedOffer(ctx.app, owner, proposer);

    const first = await confirmTrade(ctx.app, proposer, tradeId);
    const between = await collectionOf(owner);
    const again = await request(ctx.app).post(`/trades/${tradeId}/accept`).set(bearer(proposer));
    const second = await confirmTrade(ctx.app, owner, tradeId);

    expect(first).toMatchObject({ status: 'PROPOSED', proposerConfirmedAt: expect.any(String), recipientConfirmedAt: null });
    expect(between.find((item) => item.card.id === CHARIZARD)).toMatchObject({ quantity: 1, available: 0 });
    expect(again.status).toBe(409);
    expect(second).toMatchObject({
      status: 'ACCEPTED',
      completedAt: expect.any(String),
      proposerConfirmedAt: expect.any(String),
      recipientConfirmedAt: expect.any(String),
    });

    const quantityOf = (items: Awaited<ReturnType<typeof collectionOf>>, cardId: string) =>
      items.filter((item) => item.card.id === cardId).reduce((sum, item) => sum + item.quantity, 0);
    const ownerCards = await collectionOf(owner);
    const proposerCards = await collectionOf(proposer);
    expect(quantityOf(ownerCards, CHARIZARD)).toBe(0);
    expect(quantityOf(ownerCards, PROFESSOR_OAK)).toBe(2);
    expect(quantityOf(proposerCards, CHARIZARD)).toBe(1);
    expect(quantityOf(proposerCards, PROFESSOR_OAK)).toBe(0);
    expect(await listingOf(owner, listing.id)).toMatchObject({ status: 'CLOSED' });

    const wishlist = await request(ctx.app).get('/wishlist').set(bearer(proposer));
    expect(wishlist.body.data.items).toHaveLength(0);
  });

  test('terceiro → 403; troca finalizada → 409', async () => {
    const owner = await registerUser(ctx.app);
    const proposer = await registerUser(ctx.app);
    const stranger = await registerUser(ctx.app);
    const { tradeId } = await acceptedOffer(ctx.app, owner, proposer);

    await request(ctx.app).post(`/trades/${tradeId}/accept`).set(bearer(stranger)).expect(403);
    await confirmTrade(ctx.app, owner, tradeId);
    await confirmTrade(ctx.app, proposer, tradeId);
    await request(ctx.app).post(`/trades/${tradeId}/accept`).set(bearer(owner)).expect(409);
    await request(ctx.app).post(`/trades/${tradeId}/cancel`).set(bearer(proposer)).expect(409);
    await request(ctx.app).post(`/trades/${tradeId}/reject`).set(bearer(owner)).expect(409);
  });
});

describe('recusar, cancelar e ver a troca', () => {
  test('recusar libera a reserva e devolve a quantidade ao anúncio (Em troca volta a ativo)', async () => {
    const owner = await registerUser(ctx.app);
    const proposer = await registerUser(ctx.app);
    const { proposerItem, listing, tradeId } = await acceptedOffer(ctx.app, owner, proposer);

    const res = await request(ctx.app).post(`/trades/${tradeId}/reject`).set(bearer(owner));

    expect(res.status).toBe(200);
    expect((await collectionOf(proposer)).find((item) => item.id === proposerItem.id)).toMatchObject({ quantity: 2, available: 2 });
    expect(await listingOf(owner, listing.id)).toMatchObject({ status: 'ACTIVE', quantity: 1 });
  });

  test('quem fez a oferta cancela mesmo depois de ter confirmado', async () => {
    const owner = await registerUser(ctx.app);
    const proposer = await registerUser(ctx.app);
    const { tradeId } = await acceptedOffer(ctx.app, owner, proposer);
    await confirmTrade(ctx.app, proposer, tradeId);

    const res = await request(ctx.app).post(`/trades/${tradeId}/cancel`).set(bearer(proposer));

    expect(res.status).toBe(200);
    expect(res.body.data.trade.status).toBe('CANCELED');
  });

  test('anúncio fechado no meio-tempo não reabre quando a troca cai', async () => {
    const owner = await registerUser(ctx.app);
    const proposer = await registerUser(ctx.app);
    const { listing, tradeId } = await acceptedOffer(ctx.app, owner, proposer);
    await request(ctx.app).patch(`/listings/${listing.id}`).set(bearer(owner)).send({ status: 'CLOSED' }).expect(200);

    await request(ctx.app).post(`/trades/${tradeId}/cancel`).set(bearer(proposer)).expect(200);

    expect(await listingOf(owner, listing.id)).toMatchObject({ status: 'CLOSED', quantity: 0 });
  });

  test('anúncio pausado no meio-tempo recebe a quantidade e continua pausado', async () => {
    const owner = await registerUser(ctx.app);
    const proposer = await registerUser(ctx.app);
    const { listing, tradeId } = await acceptedOffer(ctx.app, owner, proposer);
    await request(ctx.app).patch(`/listings/${listing.id}`).set(bearer(owner)).send({ status: 'PAUSED' }).expect(200);

    await request(ctx.app).post(`/trades/${tradeId}/reject`).set(bearer(owner)).expect(200);

    expect(await listingOf(owner, listing.id)).toMatchObject({ status: 'PAUSED', quantity: 1 });
  });

  test('GET /trades/:id: as duas partes veem; terceiro e ADMIN → 403', async () => {
    const owner = await registerUser(ctx.app);
    const proposer = await registerUser(ctx.app);
    const stranger = await registerUser(ctx.app);
    const admin = await loginSeedUser(ctx.app, 'admin');
    const { tradeId } = await acceptedOffer(ctx.app, owner, proposer);

    await request(ctx.app).get(`/trades/${tradeId}`).set(bearer(owner)).expect(200);
    await request(ctx.app).get(`/trades/${tradeId}`).set(bearer(proposer)).expect(200);
    await request(ctx.app).get(`/trades/${tradeId}`).set(bearer(stranger)).expect(403);
    await request(ctx.app).get(`/trades/${tradeId}`).set(bearer(admin)).expect(403);
  });

  test('GET /trades/me separa enviadas e recebidas', async () => {
    const owner = await registerUser(ctx.app);
    const proposer = await registerUser(ctx.app);
    const { tradeId } = await acceptedOffer(ctx.app, owner, proposer);

    const mine = await request(ctx.app).get('/trades/me').set(bearer(proposer));
    const theirs = await request(ctx.app).get('/trades/me').set(bearer(owner));

    expect(mine.body.data.sent.map((t: { id: string }) => t.id)).toEqual([tradeId]);
    expect(theirs.body.data.received.map((t: { id: string }) => t.id)).toEqual([tradeId]);
  });
});
