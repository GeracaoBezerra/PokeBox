import request from 'supertest';

import type { PrismaClient } from '../../src/generated/prisma/index.js';
import { addItem, bearer, CHARIZARD, confirmTrade, createListing, makeOffer, PROFESSOR_OAK } from './support/flows.js';
import { cardTotals, collectionsOf, invariantProblems, quantityOf, type ItemState } from './support/integrity.js';
import { registerUser, startTestApp, type TestApp, type TestUser } from './support/testApp.js';

let ctx: TestApp;
let db: PrismaClient;

const CARDS = [CHARIZARD, PROFESSOR_OAK];

beforeAll(async () => {
  ctx = await startTestApp();
  db = ctx.container.infra.prisma;
});

afterAll(() => ctx.close());

interface Scene {
  owner: TestUser;
  proposer: TestUser;
  listing: { id: string };
  offer: { id: string };
  before: ItemState[];
  totals: Record<string, number>;
}

async function scene(): Promise<Scene> {
  const owner = await registerUser(ctx.app);
  const proposer = await registerUser(ctx.app);
  const ownerItem = await addItem(ctx.app, owner, { cardId: CHARIZARD });
  const proposerItem = await addItem(ctx.app, proposer, { cardId: PROFESSOR_OAK, finish: 'NORMAL', quantity: 2 });
  const listing = await createListing(ctx.app, owner, ownerItem.id);
  const offer = await makeOffer(ctx.app, proposer, listing.id, [{ collectionItemId: proposerItem.id, quantity: 2 }]);

  return {
    owner,
    proposer,
    listing,
    offer,
    before: await collectionsOf(db, [owner.id, proposer.id]),
    totals: await cardTotals(db, CARDS),
  };
}

async function accept(owner: TestUser, offerId: string): Promise<string> {
  const res = await request(ctx.app).patch(`/offers/${offerId}/status`).set(bearer(owner)).send({ status: 'ACCEPTED' });
  expect(res.status).toBe(200);
  return res.body.data.offer.tradeId;
}

async function expectConserved(users: TestUser[], totals: Record<string, number>): Promise<void> {
  expect(await cardTotals(db, CARDS)).toEqual(totals);
  expect(await invariantProblems(db, users.map((user) => user.id))).toEqual([]);
}

async function listingState(id: string) {
  return db.listing.findUniqueOrThrow({ where: { id }, select: { status: true, quantity: true } });
}

describe('conservação da coleção em cada caminho da troca', () => {
  test('concluir: só as cartas da troca mudam, para quem devem ir', async () => {
    const { owner, proposer, offer, before, totals } = await scene();
    const tradeId = await accept(owner, offer.id);

    await confirmTrade(ctx.app, owner, tradeId);
    await confirmTrade(ctx.app, proposer, tradeId);

    const after = await collectionsOf(db, [owner.id, proposer.id]);
    expect(quantityOf(after, owner.id, CHARIZARD)).toBe(quantityOf(before, owner.id, CHARIZARD) - 1);
    expect(quantityOf(after, proposer.id, CHARIZARD)).toBe(quantityOf(before, proposer.id, CHARIZARD) + 1);
    expect(quantityOf(after, proposer.id, PROFESSOR_OAK)).toBe(quantityOf(before, proposer.id, PROFESSOR_OAK) - 2);
    expect(quantityOf(after, owner.id, PROFESSOR_OAK)).toBe(quantityOf(before, owner.id, PROFESSOR_OAK) + 2);
    expect(after.every((item) => item.reservedQuantity === 0)).toBe(true);
    await expectConserved([owner, proposer], totals);
  });

  test('recusar depois de confirmar: cada coleção volta igual ao início', async () => {
    const { owner, proposer, listing, offer, before, totals } = await scene();
    const tradeId = await accept(owner, offer.id);
    await confirmTrade(ctx.app, owner, tradeId);

    await request(ctx.app).post(`/trades/${tradeId}/reject`).set(bearer(owner)).expect(200);

    expect(await collectionsOf(db, [owner.id, proposer.id])).toEqual(before);
    expect(await listingState(listing.id)).toEqual({ status: 'ACTIVE', quantity: 1 });
    await expectConserved([owner, proposer], totals);
  });

  test('cancelar depois de confirmar: cada coleção volta igual ao início', async () => {
    const { owner, proposer, listing, offer, before, totals } = await scene();
    const tradeId = await accept(owner, offer.id);
    await confirmTrade(ctx.app, proposer, tradeId);

    await request(ctx.app).post(`/trades/${tradeId}/cancel`).set(bearer(proposer)).expect(200);

    expect(await collectionsOf(db, [owner.id, proposer.id])).toEqual(before);
    expect(await listingState(listing.id)).toEqual({ status: 'ACTIVE', quantity: 1 });
    await expectConserved([owner, proposer], totals);
  });

  test('aceite que falha: nada muda', async () => {
    const owner = await registerUser(ctx.app);
    const proposer = await registerUser(ctx.app);
    const listing = await createListing(ctx.app, owner, (await addItem(ctx.app, owner)).id);
    const oak = await addItem(ctx.app, proposer, { cardId: PROFESSOR_OAK, finish: 'NORMAL', quantity: 2 });
    const offer = await makeOffer(ctx.app, proposer, listing.id, [{ collectionItemId: oak.id, quantity: 2 }]);
    await request(ctx.app).patch(`/collection/${oak.id}`).set(bearer(proposer)).send({ quantity: 1 }).expect(200);
    const before = await collectionsOf(db, [owner.id, proposer.id]);
    const totals = await cardTotals(db, CARDS);

    await request(ctx.app).patch(`/offers/${offer.id}/status`).set(bearer(owner)).send({ status: 'ACCEPTED' }).expect(422);

    expect(await collectionsOf(db, [owner.id, proposer.id])).toEqual(before);
    expect(await listingState(listing.id)).toEqual({ status: 'ACTIVE', quantity: 1 });
    expect(await db.trade.count({ where: { offerId: offer.id } })).toBe(0);
    await expectConserved([owner, proposer], totals);
  });

  test('duas trocas no mesmo anúncio: uma conclui, a outra cancela e a quantidade volta ao anúncio', async () => {
    const owner = await registerUser(ctx.app);
    const first = await registerUser(ctx.app);
    const second = await registerUser(ctx.app);
    const third = await registerUser(ctx.app);
    const ownerItem = await addItem(ctx.app, owner, { cardId: CHARIZARD, quantity: 2 });
    const listing = await createListing(ctx.app, owner, ownerItem.id, 2);
    const offerFrom = async (user: TestUser) => {
      const oak = await addItem(ctx.app, user, { cardId: PROFESSOR_OAK, finish: 'NORMAL' });
      return makeOffer(ctx.app, user, listing.id, [{ collectionItemId: oak.id, quantity: 1 }]);
    };
    const offerA = await offerFrom(first);
    const offerB = await offerFrom(second);
    const waiting = await offerFrom(third);
    const users = [owner, first, second, third];
    const before = await collectionsOf(db, users.map((user) => user.id));
    const totals = await cardTotals(db, CARDS);

    const tradeA = await accept(owner, offerA.id);
    expect(await listingState(listing.id)).toEqual({ status: 'ACTIVE', quantity: 1 });
    const tradeB = await accept(owner, offerB.id);
    expect(await listingState(listing.id)).toEqual({ status: 'IN_TRADE', quantity: 0 });

    await confirmTrade(ctx.app, first, tradeA);
    await confirmTrade(ctx.app, owner, tradeA);
    expect(await listingState(listing.id)).toEqual({ status: 'IN_TRADE', quantity: 0 });
    await expectConserved(users, totals);

    await request(ctx.app).post(`/trades/${tradeB}/cancel`).set(bearer(second)).expect(200);
    expect(await listingState(listing.id)).toEqual({ status: 'ACTIVE', quantity: 1 });

    const held = await request(ctx.app).get(`/offers/${waiting.id}`).set(bearer(third));
    expect(held.body.data.offer).toMatchObject({ status: 'PROPOSED', onHold: false });

    const after = await collectionsOf(db, users.map((user) => user.id));
    expect(quantityOf(after, owner.id, CHARIZARD)).toBe(quantityOf(before, owner.id, CHARIZARD) - 1);
    expect(quantityOf(after, first.id, CHARIZARD)).toBe(1);
    expect(quantityOf(after, second.id, PROFESSOR_OAK)).toBe(quantityOf(before, second.id, PROFESSOR_OAK));
    expect(quantityOf(after, third.id, PROFESSOR_OAK)).toBe(quantityOf(before, third.id, PROFESSOR_OAK));
    await expectConserved(users, totals);
  });

  test('anúncio que fecha de verdade cancela as ofertas em espera com o motivo trocado', async () => {
    const owner = await registerUser(ctx.app);
    const proposer = await registerUser(ctx.app);
    const late = await registerUser(ctx.app);
    const listing = await createListing(ctx.app, owner, (await addItem(ctx.app, owner)).id);
    const oak = async (user: TestUser) => addItem(ctx.app, user, { cardId: PROFESSOR_OAK, finish: 'NORMAL' });
    const offer = await makeOffer(ctx.app, proposer, listing.id, [{ collectionItemId: (await oak(proposer)).id, quantity: 1 }]);
    const waiting = await makeOffer(ctx.app, late, listing.id, [{ collectionItemId: (await oak(late)).id, quantity: 1 }]);
    const totals = await cardTotals(db, CARDS);
    const tradeId = await accept(owner, offer.id);

    await confirmTrade(ctx.app, proposer, tradeId);
    await confirmTrade(ctx.app, owner, tradeId);

    const held = await request(ctx.app).get(`/offers/${waiting.id}`).set(bearer(late));
    expect(await listingState(listing.id)).toEqual({ status: 'CLOSED', quantity: 0 });
    expect(held.body.data.offer).toMatchObject({ status: 'CANCELED', cancelReason: 'LISTING_TRADED' });
    await expectConserved([owner, proposer, late], totals);
  });

  test('anúncios de quem ofertou que passariam do disponível ficam Em troca e voltam quando a troca cai', async () => {
    const owner = await registerUser(ctx.app);
    const proposer = await registerUser(ctx.app);
    const ownerListing = await createListing(ctx.app, owner, (await addItem(ctx.app, owner)).id);
    const oak = await addItem(ctx.app, proposer, { cardId: PROFESSOR_OAK, finish: 'NORMAL', quantity: 1 });
    const proposerListing = await createListing(ctx.app, proposer, oak.id);
    const offer = await makeOffer(ctx.app, proposer, ownerListing.id, [{ collectionItemId: oak.id, quantity: 1 }]);
    const before = await collectionsOf(db, [owner.id, proposer.id]);
    const totals = await cardTotals(db, CARDS);

    const tradeId = await accept(owner, offer.id);
    expect(await listingState(proposerListing.id)).toEqual({ status: 'IN_TRADE', quantity: 0 });
    await expectConserved([owner, proposer], totals);

    await request(ctx.app).post(`/trades/${tradeId}/reject`).set(bearer(owner)).expect(200);

    expect(await listingState(proposerListing.id)).toEqual({ status: 'ACTIVE', quantity: 1 });
    expect(await collectionsOf(db, [owner.id, proposer.id])).toEqual(before);
    await expectConserved([owner, proposer], totals);
  });
});
