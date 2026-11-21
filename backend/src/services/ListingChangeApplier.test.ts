import { jest } from '@jest/globals';

import type { Db } from '../lib/prisma.js';
import type { ListingUpdater, ListingWithItem } from '../repositories/ListingRepository.js';
import type { ListingOfferCanceller } from '../repositories/OfferRepository.js';
import { ListingChangeApplier } from './ListingChangeApplier.js';

const LISTING_ID = 'listing-id';
const tx = { name: 'tx' } as unknown as Db;
const saved = { id: LISTING_ID } as ListingWithItem;

function setup() {
  const listings = { update: jest.fn<ListingUpdater['update']>(async () => saved) };
  const offers = {
    cancelOpenByListing: jest.fn<ListingOfferCanceller['cancelOpenByListing']>(async () => 0),
  };

  return { applier: new ListingChangeApplier(listings, offers), listings, offers };
}

const active = { id: LISTING_ID, quantity: 2, status: 'ACTIVE' as const };

describe('ListingChangeApplier', () => {
  it('fechar cancela as ofertas abertas com o motivo anúncio fechado e grava a mudança', async () => {
    const { applier, listings, offers } = setup();

    const result = await applier.apply(active, { status: 'CLOSED' }, tx);

    expect(offers.cancelOpenByListing).toHaveBeenCalledWith(LISTING_ID, 'LISTING_CLOSED', tx);
    expect(listings.update).toHaveBeenCalledWith(LISTING_ID, { status: 'CLOSED' }, tx);
    expect(result).toBe(saved);
  });

  it('bloquear cancela as abertas com o motivo anúncio bloqueado', async () => {
    const { applier, offers } = setup();

    await applier.apply(active, { status: 'BLOCKED' }, tx);

    expect(offers.cancelOpenByListing).toHaveBeenCalledWith(LISTING_ID, 'LISTING_BLOCKED', tx);
  });

  it('o motivo pode vir de quem fecha (troca concluída)', async () => {
    const { applier, offers } = setup();

    await applier.apply({ ...active, status: 'IN_TRADE', quantity: 0 }, { status: 'CLOSED' }, undefined, 'LISTING_TRADED');

    expect(offers.cancelOpenByListing).toHaveBeenCalledWith(LISTING_ID, 'LISTING_TRADED', undefined);
  });

  it.each([
    ['diminuir', { quantity: 1 }],
    ['pausar', { status: 'PAUSED' as const }],
    ['entrar em troca', { quantity: 0, status: 'IN_TRADE' as const }],
  ])('%s não cancela ofertas (as que não cabem ficam em espera)', async (_, change) => {
    const { applier, listings, offers } = setup();

    await applier.apply(active, change, tx);

    expect(offers.cancelOpenByListing).not.toHaveBeenCalled();
    expect(listings.update).toHaveBeenCalledWith(LISTING_ID, change, tx);
  });

  it('sem transação explícita, usa a conexão do próprio repositório', async () => {
    const { applier, listings } = setup();

    await applier.apply(active, { quantity: 1 });

    expect(listings.update).toHaveBeenCalledWith(LISTING_ID, { quantity: 1 }, undefined);
  });
});
