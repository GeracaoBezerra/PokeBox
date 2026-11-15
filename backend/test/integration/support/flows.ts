import type { Express } from 'express';
import request from 'supertest';

import type { TestUser } from './testApp.js';

export function bearer(user: TestUser | string): { Authorization: string } {
  return { Authorization: `Bearer ${typeof user === 'string' ? user : user.token}` };
}

export interface NewItem {
  cardId?: string;
  quantity?: number;
  finish?: 'NORMAL' | 'HOLO' | 'REVERSE';
  firstEdition?: boolean;
  condition?: string;
  isPublic?: boolean;
}

export const CHARIZARD = 'base1-4';
export const PROFESSOR_OAK = 'base1-88';

function expectStatus(res: request.Response, status: number, what: string): void {
  if (res.status !== status) {
    throw new Error(`${what}: esperado ${status}, veio ${res.status} ${JSON.stringify(res.body)}`);
  }
}

export async function addItem(app: Express, user: TestUser, item: NewItem = {}) {
  const body = { cardId: CHARIZARD, quantity: 1, finish: 'HOLO', firstEdition: false, ...item };
  const res = await request(app).post('/collection').set(bearer(user)).send(body);
  expectStatus(res, 201, `POST /collection (${body.cardId})`);
  return res.body.data.item;
}

export async function createListing(app: Express, user: TestUser, collectionItemId: string, quantity = 1) {
  const res = await request(app).post('/listings').set(bearer(user)).send({ collectionItemId, quantity });
  expectStatus(res, 201, 'POST /listings');
  return res.body.data.listing;
}

export async function makeOffer(
  app: Express,
  user: TestUser,
  listingId: string,
  items: { collectionItemId: string; quantity: number }[],
  quantity = 1,
) {
  const res = await request(app).post(`/listings/${listingId}/offers`).set(bearer(user)).send({ quantity, items });
  expectStatus(res, 201, 'POST /listings/:id/offers');
  return res.body.data.offer;
}

export async function setOfferStatus(app: Express, user: TestUser, offerId: string, status: string) {
  const res = await request(app).patch(`/offers/${offerId}/status`).set(bearer(user)).send({ status });
  expectStatus(res, 200, `PATCH /offers/:id/status ${status}`);
  return res.body.data.offer;
}

export async function createTrade(app: Express, user: TestUser, offerId: string) {
  const res = await request(app).post('/trades').set(bearer(user)).send({ offerId });
  expectStatus(res, 201, 'POST /trades');
  return res.body.data.trade;
}

export interface Negotiation {
  ownerItem: { id: string };
  proposerItem: { id: string };
  listing: { id: string };
  offer: { id: string };
}

export async function acceptedOffer(app: Express, owner: TestUser, proposer: TestUser): Promise<Negotiation> {
  const ownerItem = await addItem(app, owner, { cardId: CHARIZARD });
  const proposerItem = await addItem(app, proposer, { cardId: PROFESSOR_OAK, finish: 'NORMAL', quantity: 2 });
  const listing = await createListing(app, owner, ownerItem.id);
  const offer = await makeOffer(app, proposer, listing.id, [{ collectionItemId: proposerItem.id, quantity: 2 }]);
  await setOfferStatus(app, owner, offer.id, 'ACCEPTED');
  return { ownerItem, proposerItem, listing, offer };
}
