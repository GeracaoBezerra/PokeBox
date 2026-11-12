import { jest } from '@jest/globals';

import type { Db } from '../lib/prisma.js';
import type { ListingUpdater, ListingWithItem } from '../repositories/ListingRepository.js';
import type { ListingOfferCanceller } from '../repositories/OfferRepository.js';
import { ListingChangeApplier } from './ListingChangeApplier.js';

const LISTING_ID = 'listing-id';
const tx = { name: 'tx' } as unknown as Db;
const saved = { id: LISTING_ID } as ListingWithItem;

function setup(accepted = [{ id: 'pede-2', quantity: 2 }]) {
  const listings = { update: jest.fn<ListingUpdater['update']>(async () => saved) };
  const offers = {
    cancelOpenByListing: jest.fn<ListingOfferCanceller['cancelOpenByListing']>(async () => 0),
    lockAcceptedWithoutTrade: jest.fn<ListingOfferCanceller['lockAcceptedWithoutTrade']>(async () => accepted),
    cancelByIds: jest.fn<ListingOfferCanceller['cancelByIds']>(async (ids) => ids.length),
  };

  return { applier: new ListingChangeApplier(listings, offers), listings, offers };
}

const active = { id: LISTING_ID, quantity: 2, status: 'ACTIVE' as const };

describe('ListingChangeApplier', () => {
  it('fechar cancela as ofertas abertas e as aceitas e grava a mudança', async () => {
    const { applier, listings, offers } = setup();

    const result = await applier.apply(active, { status: 'CLOSED' }, tx);

    expect(offers.cancelOpenByListing).toHaveBeenCalledWith(LISTING_ID, tx);
    expect(offers.cancelByIds).toHaveBeenCalledWith(['pede-2'], tx);
    expect(listings.update).toHaveBeenCalledWith(LISTING_ID, { status: 'CLOSED' }, tx);
    expect(result).toBe(saved);
  });

  it('bloquear também cancela as abertas', async () => {
    const { applier, offers } = setup();

    await applier.apply(active, { status: 'BLOCKED' }, tx);

    expect(offers.cancelOpenByListing).toHaveBeenCalledWith(LISTING_ID, tx);
  });

  it('diminuir para 1 com uma aceita de 2 cancela a aceita, mas não as abertas', async () => {
    const { applier, offers } = setup();

    await applier.apply(active, { quantity: 1 }, tx);

    expect(offers.cancelOpenByListing).not.toHaveBeenCalled();
    expect(offers.cancelByIds).toHaveBeenCalledWith(['pede-2'], tx);
  });

  it('diminuir mantém a aceita que ainda cabe', async () => {
    const { applier, offers } = setup([{ id: 'pede-1', quantity: 1 }]);

    await applier.apply(active, { quantity: 1 }, tx);

    expect(offers.cancelByIds).toHaveBeenCalledWith([], tx);
  });

  it('pausar não cancela a aceita nem trava as ofertas', async () => {
    const { applier, listings, offers } = setup();

    await applier.apply(active, { status: 'PAUSED' }, tx);

    expect(offers.lockAcceptedWithoutTrade).not.toHaveBeenCalled();
    expect(offers.cancelByIds).not.toHaveBeenCalled();
    expect(listings.update).toHaveBeenCalledWith(LISTING_ID, { status: 'PAUSED' }, tx);
  });

  it('sem transação explícita, usa a conexão do próprio repositório', async () => {
    const { applier, listings } = setup();

    await applier.apply(active, { quantity: 1 });

    expect(listings.update).toHaveBeenCalledWith(LISTING_ID, { quantity: 1 }, undefined);
  });
});
