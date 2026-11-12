import { jest } from '@jest/globals';

import type { Card } from '../generated/prisma/index.js';
import type { Db } from '../lib/prisma.js';
import type { LockedCollectionItem } from '../repositories/CollectionRepository.js';
import type { ListingWithItem } from '../repositories/ListingRepository.js';
import type { TransactionRunner } from '../repositories/TransactionRunner.js';
import type { ListingOfferCanceller } from '../repositories/OfferRepository.js';
import { ListingChangeApplier } from './ListingChangeApplier.js';
import { ListingService, type ListingServiceDeps, type ListingStore } from './ListingService.js';

const OWNER_ID = 'owner-id';
const LISTING_ID = 'listing-id';

const tx = { name: 'tx' } as unknown as Db;

class FakeRunner implements TransactionRunner {
  run<T>(work: (db: Db) => Promise<T>): Promise<T> {
    return work(tx);
  }
}

const owner = { id: OWNER_ID, role: 'USER' as const };
const admin = { id: 'admin-id', role: 'ADMIN' as const };

const listing = {
  id: LISTING_ID,
  collectionItemId: 'item-id',
  quantity: 3,
  description: null,
  status: 'ACTIVE',
  createdAt: new Date(),
  updatedAt: new Date(),
  collectionItem: {
    id: 'item-id',
    userId: OWNER_ID,
    cardId: 'base1-4',
    quantity: 3,
    reservedQuantity: 0,
    condition: 'NEAR_MINT',
    finish: 'HOLO',
    firstEdition: false,
    isPublic: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    user: { username: 'ash', name: 'Ash', accountStatus: 'ACTIVE', deletedAt: null },
    card: { id: 'base1-4', name: 'Charizard', marketPrice: null } as Card,
  },
} satisfies ListingWithItem;

const lockedItem: LockedCollectionItem = {
  id: 'item-id',
  userId: OWNER_ID,
  cardId: 'base1-4',
  quantity: 3,
  reservedQuantity: 0,
  condition: 'NEAR_MINT',
};

const accepted = [
  { id: 'pede-1', quantity: 1 },
  { id: 'pede-2', quantity: 2 },
];

function setup() {
  const listings = {
    findActive: jest.fn<ListingStore['findActive']>(async () => [listing]),
    findByOwner: jest.fn<ListingStore['findByOwner']>(async () => [listing]),
    findById: jest.fn<ListingStore['findById']>(async () => listing),
    sumOpenByItem: jest.fn<ListingStore['sumOpenByItem']>(async () => 0),
    create: jest.fn<ListingStore['create']>(async () => listing),
    update: jest.fn(async () => listing),
  };
  const offers = {
    cancelOpenByListing: jest.fn<ListingOfferCanceller['cancelOpenByListing']>(async () => 0),
    lockAcceptedWithoutTrade: jest.fn<ListingOfferCanceller['lockAcceptedWithoutTrade']>(async () => accepted),
    cancelByIds: jest.fn<ListingOfferCanceller['cancelByIds']>(async (ids) => ids.length),
  };
  const collection = {
    lockById: jest.fn<ListingServiceDeps['collection']['lockById']>(async () => lockedItem),
  };

  const service = new ListingService({
    listings,
    collection,
    transactions: new FakeRunner(),
    changes: new ListingChangeApplier(listings, offers),
  });

  return { service, listings, offers, collection };
}

describe('update cancela ofertas aceitas sem troca', () => {
  it('fechar cancela as abertas e todas as aceitas', async () => {
    const { service, offers } = setup();

    await service.update(owner, LISTING_ID, { status: 'CLOSED' });

    expect(offers.cancelOpenByListing).toHaveBeenCalledWith(LISTING_ID, tx);
    expect(offers.lockAcceptedWithoutTrade).toHaveBeenCalledWith(LISTING_ID, tx);
    expect(offers.cancelByIds).toHaveBeenCalledWith(['pede-1', 'pede-2'], tx);
  });

  it('bloquear (ADMIN) cancela todas as aceitas', async () => {
    const { service, offers } = setup();

    await service.update(admin, LISTING_ID, { status: 'BLOCKED' });

    expect(offers.cancelByIds).toHaveBeenCalledWith(['pede-1', 'pede-2'], tx);
  });

  it('diminuir cancela só as aceitas que pedem mais do que a nova quantidade', async () => {
    const { service, offers } = setup();

    await service.update(owner, LISTING_ID, { quantity: 1 });

    expect(offers.cancelOpenByListing).not.toHaveBeenCalled();
    expect(offers.cancelByIds).toHaveBeenCalledWith(['pede-2'], tx);
  });

  it('pausar não mexe nas aceitas', async () => {
    const { service, offers } = setup();

    await service.update(owner, LISTING_ID, { status: 'PAUSED' });

    expect(offers.lockAcceptedWithoutTrade).not.toHaveBeenCalled();
    expect(offers.cancelByIds).not.toHaveBeenCalled();
  });

  it('mudar só a descrição não trava as aceitas', async () => {
    const { service, offers } = setup();

    await service.update(owner, LISTING_ID, { description: 'troco por Blastoise' });

    expect(offers.lockAcceptedWithoutTrade).not.toHaveBeenCalled();
    expect(offers.cancelByIds).not.toHaveBeenCalled();
  });
});

describe('update: permissões e estoque', () => {
  it('outro usuário recebe 403 e nada é gravado', async () => {
    const { service, listings } = setup();

    await expect(service.update({ id: 'misty-id', role: 'USER' }, LISTING_ID, { quantity: 1 })).rejects.toMatchObject({
      statusCode: 403,
    });
    expect(listings.update).not.toHaveBeenCalled();
  });

  it('anúncio que não existe dá 404 antes de abrir a transação', async () => {
    const { service, listings, collection } = setup();
    listings.findById.mockResolvedValueOnce(null);

    await expect(service.update(owner, LISTING_ID, { quantity: 1 })).rejects.toMatchObject({ statusCode: 404 });
    expect(collection.lockById).not.toHaveBeenCalled();
  });

  it('aumentar além do disponível dá 422 (RN-05), sem contar o próprio anúncio', async () => {
    const { service, listings } = setup();

    await expect(service.update(owner, LISTING_ID, { quantity: 4 })).rejects.toMatchObject({ statusCode: 422 });
    expect(listings.sumOpenByItem).toHaveBeenCalledWith('item-id', tx, LISTING_ID);
    expect(listings.update).not.toHaveBeenCalled();
  });
});

describe('create (RN-05)', () => {
  const input = { collectionItemId: 'item-id', quantity: 2 };

  it('trava o item, confere o estoque e grava na mesma transação', async () => {
    const { service, listings, collection } = setup();

    const result = await service.create(OWNER_ID, input);

    expect(collection.lockById).toHaveBeenCalledWith('item-id', tx);
    expect(listings.sumOpenByItem).toHaveBeenCalledWith('item-id', tx, undefined);
    expect(listings.create).toHaveBeenCalledWith(input, tx);
    expect(result.owner).toEqual({ username: 'ash', name: 'Ash' });
  });

  it('anunciar mais do que tem disponível dá 422', async () => {
    const { service, listings } = setup();
    listings.sumOpenByItem.mockResolvedValueOnce(2);

    await expect(service.create(OWNER_ID, input)).rejects.toMatchObject({ statusCode: 422 });
    expect(listings.create).not.toHaveBeenCalled();
  });

  it('item de outro usuário dá 403', async () => {
    const { service } = setup();

    await expect(service.create('misty-id', input)).rejects.toMatchObject({ statusCode: 403 });
  });

  it('item que não existe dá 404', async () => {
    const { service, collection } = setup();
    collection.lockById.mockResolvedValueOnce(null);

    await expect(service.create(OWNER_ID, input)).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe('leituras', () => {
  it('list pede um a mais para saber se há próxima página', async () => {
    const { service, listings } = setup();
    listings.findActive.mockResolvedValueOnce([listing, listing, listing]);

    const result = await service.list({ page: 2, limit: 2, sort: 'recent', q: 'charizard' });

    expect(listings.findActive).toHaveBeenCalledWith({ sort: 'recent', q: 'charizard', skip: 2, take: 3 });
    expect(result.items).toHaveLength(2);
    expect(result.hasNextPage).toBe(true);
  });

  it('listByCard limita a 50 anúncios', async () => {
    const { service, listings } = setup();

    await service.listByCard('base1-4');

    expect(listings.findActive).toHaveBeenCalledWith({ cardId: 'base1-4', take: 50 });
  });

  it('getById esconde anúncio pausado de quem não é dono: 404', async () => {
    const { service, listings } = setup();
    listings.findById.mockResolvedValueOnce({ ...listing, status: 'PAUSED' });

    await expect(service.getById(undefined, LISTING_ID)).rejects.toMatchObject({ statusCode: 404 });
  });
});
