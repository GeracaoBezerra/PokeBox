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

describe('update cancela ofertas abertas só quando o anúncio fecha ou é bloqueado', () => {
  it('fechar cancela as abertas com o motivo anúncio fechado', async () => {
    const { service, offers } = setup();

    await service.update(owner, LISTING_ID, { status: 'CLOSED' });

    expect(offers.cancelOpenByListing).toHaveBeenCalledWith(LISTING_ID, 'LISTING_CLOSED', tx);
  });

  it('bloquear (ADMIN) cancela as abertas com o motivo anúncio bloqueado', async () => {
    const { service, offers } = setup();

    await service.update(admin, LISTING_ID, { status: 'BLOCKED' });

    expect(offers.cancelOpenByListing).toHaveBeenCalledWith(LISTING_ID, 'LISTING_BLOCKED', tx);
  });

  it.each([
    ['diminuir', { quantity: 1 }],
    ['pausar', { status: 'PAUSED' as const }],
    ['mudar só a descrição', { description: 'troco por Blastoise' }],
  ])('%s não cancela nada', async (_, input) => {
    const { service, offers } = setup();

    await service.update(owner, LISTING_ID, input);

    expect(offers.cancelOpenByListing).not.toHaveBeenCalled();
  });
});

describe('update: anúncio em troca', () => {
  const inTrade = { ...listing, status: 'IN_TRADE' as const, quantity: 0 };

  it('dono pausa ou fecha', async () => {
    const { service, listings } = setup();
    listings.findById.mockResolvedValue(inTrade);

    await service.update(owner, LISTING_ID, { status: 'PAUSED' });
    await service.update(owner, LISTING_ID, { status: 'CLOSED' });

    expect(listings.update).toHaveBeenCalledTimes(2);
  });

  it('dono não muda a quantidade nem reativa (409)', async () => {
    const { service, listings } = setup();
    listings.findById.mockResolvedValue(inTrade);

    await expect(service.update(owner, LISTING_ID, { quantity: 1 })).rejects.toMatchObject({ statusCode: 409 });
    await expect(service.update(owner, LISTING_ID, { status: 'ACTIVE' })).rejects.toMatchObject({ statusCode: 409 });
    expect(listings.update).not.toHaveBeenCalled();
  });

  it('ninguém põe Em troca à mão (422)', async () => {
    const { service } = setup();

    await expect(service.update(owner, LISTING_ID, { status: 'IN_TRADE' })).rejects.toMatchObject({ statusCode: 422 });
  });

  it('pausado com 0 só reativa com quantidade (422)', async () => {
    const { service, listings } = setup();
    listings.findById.mockResolvedValue({ ...listing, status: 'PAUSED', quantity: 0 });

    await expect(service.update(owner, LISTING_ID, { status: 'ACTIVE' })).rejects.toMatchObject({ statusCode: 422 });
    await service.update(owner, LISTING_ID, { status: 'ACTIVE', quantity: 1 });
    expect(listings.update).toHaveBeenCalledTimes(1);
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

    expect(listings.findActive).toHaveBeenCalledWith({ sort: 'recent', q: 'charizard', withInTrade: true, skip: 2, take: 3 });
    expect(result.items).toHaveLength(2);
    expect(result.hasNextPage).toBe(true);
  });

  it('listMine sem paginação busca todos os anúncios do dono', async () => {
    const { service, listings } = setup();

    const items = await service.listMine(OWNER_ID);

    expect(listings.findByOwner).toHaveBeenCalledWith(OWNER_ID);
    expect(items).toHaveLength(1);
  });

  it('listMinePage pede skip/take e corta no limite', async () => {
    const { service, listings } = setup();
    listings.findByOwner.mockResolvedValueOnce([listing, listing]);

    const result = await service.listMinePage(OWNER_ID, { page: 3, limit: 1 });

    expect(listings.findByOwner).toHaveBeenCalledWith(OWNER_ID, { skip: 2, take: 2 });
    expect(result.items).toHaveLength(1);
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

describe('getById: anúncio em troca', () => {
  it('é visível para qualquer pessoa, sem login', async () => {
    const { service, listings } = setup();
    listings.findById.mockResolvedValueOnce({ ...listing, status: 'IN_TRADE', quantity: 0 });

    const result = await service.getById(undefined, LISTING_ID);

    expect(result.status).toBe('IN_TRADE');
  });
});
