import { jest } from '@jest/globals';

import type { ListingWithItem } from '../repositories/ListingRepository.js';
import type { OfferWithDetails } from '../repositories/OfferRepository.js';
import type {
  TradeUnitOfWork,
  UnitCollection,
  UnitListings,
  UnitOffers,
  UnitOfWorkFactory,
  UnitTrades,
} from '../repositories/UnitOfWork.js';
import type { CreateOfferInput } from '../schemas/offer.schema.js';
import { OfferService, type OfferReader } from './OfferService.js';
import type { TradeOpener } from './TradeOpener.js';

const OWNER_ID = 'owner-id';
const PROPOSER_ID = 'proposer-id';
const OFFER_ID = 'offer-id';
const LISTING_ID = 'listing-id';

class FakeUnitOfWorkFactory implements UnitOfWorkFactory {
  runs = 0;

  constructor(private readonly uow: TradeUnitOfWork) {}

  run<T>(work: (uow: TradeUnitOfWork) => Promise<T>): Promise<T> {
    this.runs += 1;
    return work(this.uow);
  }
}

const listing = {
  id: LISTING_ID,
  collectionItemId: 'item-owner',
  quantity: 2,
  description: null,
  status: 'ACTIVE',
  createdAt: new Date(),
  updatedAt: new Date(),
  collectionItem: {
    id: 'item-owner',
    userId: OWNER_ID,
    condition: 'NEAR_MINT',
    finish: 'HOLO',
    firstEdition: false,
    user: { username: 'ash', name: 'Ash', accountStatus: 'ACTIVE', deletedAt: null },
    card: { id: 'base1-4', name: 'Charizard', marketPrice: null },
  },
} as ListingWithItem;

const offerFrom = (status: OfferWithDetails['status']) =>
  ({
    id: OFFER_ID,
    status,
    listingId: LISTING_ID,
    proposerId: PROPOSER_ID,
    quantity: 1,
    message: null,
    createdAt: new Date(),
    respondedAt: null,
    proposer: { username: 'misty', name: 'Misty' },
    listing,
    items: [],
  }) as unknown as OfferWithDetails;

const accepted = { id: OFFER_ID, status: 'ACCEPTED' as const, listingId: LISTING_ID, proposerId: PROPOSER_ID };

function setup() {
  const offers = {
    create: jest.fn<UnitOffers['create']>(async () => offerFrom('PROPOSED')),
    findById: jest.fn<UnitOffers['findById']>(async () => offerFrom('ACCEPTED')),
    lockById: jest.fn<UnitOffers['lockById']>(async () => accepted),
    findOpenByProposerAndListing: jest.fn<UnitOffers['findOpenByProposerAndListing']>(async () => null),
    updateStatus: jest.fn<UnitOffers['updateStatus']>(async (_id, status) => offerFrom(status)),
    deleteItems: jest.fn<UnitOffers['deleteItems']>(async () => undefined),
    cancelOpenOfUser: jest.fn<UnitOffers['cancelOpenOfUser']>(async () => 0),
  };
  const listings = {
    findById: jest.fn<UnitListings['findById']>(async () => listing),
    findOpenByItem: jest.fn<UnitListings['findOpenByItem']>(async () => []),
    closeOpenByOwner: jest.fn<UnitListings['closeOpenByOwner']>(async () => 0),
  };
  const trades = {
    create: jest.fn<UnitTrades['create']>(),
    findByOfferId: jest.fn<UnitTrades['findByOfferId']>(async () => null),
    lockById: jest.fn<UnitTrades['lockById']>(async () => null),
    updateStatus: jest.fn<UnitTrades['updateStatus']>(),
    confirm: jest.fn<UnitTrades['confirm']>(),
    addHolds: jest.fn<UnitTrades['addHolds']>(),
    findHolds: jest.fn<UnitTrades['findHolds']>(async () => []),
    countOpenHolds: jest.fn<UnitTrades['countOpenHolds']>(async () => 0),
    hasOpenFor: jest.fn<UnitTrades['hasOpenFor']>(async () => false),
  };
  const lockItemsInOrder = jest.fn<TradeUnitOfWork['lockItemsInOrder']>(
    async (ids) =>
      new Map(
        ids.map((id) => [
          id,
          { id, userId: id === 'item-owner' ? OWNER_ID : PROPOSER_ID, cardId: 'c', quantity: 2, reservedQuantity: 0, condition: 'NEAR_MINT' },
        ]),
      ),
  );
  const uow: TradeUnitOfWork = {
    collection: {
      reserve: jest.fn<UnitCollection['reserve']>(),
      release: jest.fn<UnitCollection['release']>(),
      transferOut: jest.fn<UnitCollection['transferOut']>(),
      addOrIncrement: jest.fn<UnitCollection['addOrIncrement']>(),
    },
    listings,
    offers,
    trades,
    wishlist: { removeByUserAndCard: jest.fn<TradeUnitOfWork['wishlist']['removeByUserAndCard']>() },
    users: { deactivate: jest.fn<TradeUnitOfWork['users']['deactivate']>() },
    listingChanges: { apply: jest.fn<TradeUnitOfWork['listingChanges']['apply']>() },
    lockItemsInOrder,
  };
  const readers: OfferReader = {
    findById: offers.findById,
    findSent: jest.fn<OfferReader['findSent']>(async () => []),
    findReceived: jest.fn<OfferReader['findReceived']>(async () => []),
  };
  const unitOfWork = new FakeUnitOfWorkFactory(uow);
  const opener = { open: jest.fn<TradeOpener['open']>(async () => ({ id: 'trade-id' }) as Awaited<ReturnType<TradeOpener['open']>>) };
  const service = new OfferService({ listings, offers: readers, unitOfWork, opener });

  return { service, offers, listings, trades, lockItemsInOrder, unitOfWork, readers, opener, uow };
}

const proposed = { ...accepted, status: 'PROPOSED' as const };

describe('changeStatus em oferta aberta', () => {
  it.each([
    ['proponente cancela', PROPOSER_ID, 'CANCELED', 'PROPOSER'],
    ['dono recusa', OWNER_ID, 'REJECTED', null],
  ] as const)('%s: solta as cartas, muda o status e grava o motivo', async (_, userId, nextStatus, reason) => {
    const { service, offers, unitOfWork, opener } = setup();
    offers.lockById.mockResolvedValue(proposed);

    const result = await service.changeStatus(userId, OFFER_ID, nextStatus);

    expect(unitOfWork.runs).toBe(1);
    expect(offers.deleteItems).toHaveBeenCalledWith(OFFER_ID);
    expect(offers.updateStatus).toHaveBeenCalledWith(OFFER_ID, nextStatus, undefined, reason);
    expect(opener.open).not.toHaveBeenCalled();
    expect(result.status).toBe(nextStatus);
  });

  it('oferta que não existe dá 404 sem abrir a transação', async () => {
    const { service, offers, unitOfWork } = setup();
    offers.findById.mockResolvedValueOnce(null);

    await expect(service.changeStatus(OWNER_ID, OFFER_ID, 'REJECTED')).rejects.toMatchObject({ statusCode: 404 });
    expect(unitOfWork.runs).toBe(0);
  });
});

describe('changeStatus em oferta aceita', () => {
  it.each([
    ['proponente cancela', PROPOSER_ID, 'CANCELED'],
    ['dono recusa', OWNER_ID, 'REJECTED'],
  ] as const)('%s: 409 e nada é escrito', async (_, userId, nextStatus) => {
    const { service, offers } = setup();

    await expect(service.changeStatus(userId, OFFER_ID, nextStatus)).rejects.toMatchObject({ statusCode: 409 });

    expect(offers.deleteItems).not.toHaveBeenCalled();
    expect(offers.updateStatus).not.toHaveBeenCalled();
  });
});

describe('changeStatus para ACCEPTED cria a troca (RN-08)', () => {
  it('trava as cartas, aceita e abre a troca na mesma unidade de trabalho', async () => {
    const { service, offers, lockItemsInOrder, opener, uow, unitOfWork } = setup();
    offers.lockById.mockResolvedValue(proposed);

    await service.changeStatus(OWNER_ID, OFFER_ID, 'ACCEPTED');

    expect(unitOfWork.runs).toBe(1);
    expect(lockItemsInOrder).toHaveBeenCalledWith(['item-owner']);
    expect(offers.deleteItems).not.toHaveBeenCalled();
    expect(offers.updateStatus).toHaveBeenCalledWith(OFFER_ID, 'ACCEPTED');
    expect(opener.open).toHaveBeenCalledWith(uow, expect.objectContaining({ listing }));
  });

  it('se a troca não pode nascer, o erro sobe (a transação desfaz o aceite)', async () => {
    const { service, offers, opener } = setup();
    offers.lockById.mockResolvedValue(proposed);
    opener.open.mockRejectedValue(Object.assign(new Error('indisponível'), { statusCode: 422 }));

    await expect(service.changeStatus(OWNER_ID, OFFER_ID, 'ACCEPTED')).rejects.toMatchObject({ statusCode: 422 });
  });

  it.each(['PAUSED', 'IN_TRADE'] as const)('anúncio %s não aceita oferta: 422', async (status) => {
    const { service, offers, listings, opener } = setup();
    offers.lockById.mockResolvedValue(proposed);
    listings.findById.mockResolvedValue({ ...listing, status });

    await expect(service.changeStatus(OWNER_ID, OFFER_ID, 'ACCEPTED')).rejects.toMatchObject({ statusCode: 422 });
    expect(offers.updateStatus).not.toHaveBeenCalled();
    expect(opener.open).not.toHaveBeenCalled();
  });
});

describe('create', () => {
  const input: CreateOfferInput = { quantity: 1, items: [{ collectionItemId: 'item-proposer', quantity: 1 }] };
  const proposer = { id: PROPOSER_ID, role: 'USER' as const };

  it('trava as cartas em ordem e grava a oferta na unidade de trabalho', async () => {
    const { service, offers, lockItemsInOrder } = setup();

    await service.create(proposer, LISTING_ID, input);

    expect(lockItemsInOrder).toHaveBeenCalledWith(['item-owner', 'item-proposer']);
    expect(offers.create).toHaveBeenCalledWith({
      listingId: LISTING_ID,
      proposerId: PROPOSER_ID,
      quantity: 1,
      message: undefined,
      items: input.items,
    });
  });

  it('segunda oferta aberta no mesmo anúncio dá 409', async () => {
    const { service, offers } = setup();
    offers.findOpenByProposerAndListing.mockResolvedValue({ id: 'outra' });

    await expect(service.create(proposer, LISTING_ID, input)).rejects.toMatchObject({ statusCode: 409 });
    expect(offers.create).not.toHaveBeenCalled();
  });

  it('oferecer carta de outro usuário dá 403', async () => {
    const { service, offers } = setup();
    const theirs = { ...input, items: [{ collectionItemId: 'item-owner', quantity: 1 }] };

    await expect(service.create(proposer, LISTING_ID, theirs)).rejects.toMatchObject({ statusCode: 403 });
    expect(offers.create).not.toHaveBeenCalled();
  });

  it('anúncio em troca não recebe oferta: 422', async () => {
    const { service, listings, unitOfWork } = setup();
    listings.findById.mockResolvedValueOnce({ ...listing, status: 'IN_TRADE', quantity: 0 });

    await expect(service.create(proposer, LISTING_ID, input)).rejects.toMatchObject({ statusCode: 422 });
    expect(unitOfWork.runs).toBe(0);
  });

  it('anúncio que não aparece para quem oferta dá 404 sem abrir a transação', async () => {
    const { service, listings, unitOfWork } = setup();
    listings.findById.mockResolvedValueOnce({ ...listing, status: 'PAUSED' });

    await expect(service.create(proposer, LISTING_ID, input)).rejects.toMatchObject({ statusCode: 404 });
    expect(unitOfWork.runs).toBe(0);
  });
});

describe('listMine e listMinePage', () => {
  it('sem paginação busca os dois lados inteiros, só com o status', async () => {
    const { service, readers } = setup();
    const repo = readers;
    jest.mocked(repo.findSent).mockResolvedValueOnce([offerFrom('PROPOSED')]);

    const result = await service.listMine(OWNER_ID, 'PROPOSED');

    expect(repo.findSent).toHaveBeenCalledWith(OWNER_ID, { status: 'PROPOSED' });
    expect(repo.findReceived).toHaveBeenCalledWith(OWNER_ID, { status: 'PROPOSED' });
    expect(result.sent).toHaveLength(1);
    expect(result.received).toEqual([]);
  });

  it('side sent pede skip/take só das enviadas', async () => {
    const { service, readers } = setup();
    const repo = readers;
    jest.mocked(repo.findSent).mockResolvedValueOnce([offerFrom('PROPOSED'), offerFrom('PROPOSED'), offerFrom('PROPOSED')]);

    const result = await service.listMinePage(OWNER_ID, 'sent', undefined, { page: 2, limit: 2 });

    expect(repo.findSent).toHaveBeenCalledWith(OWNER_ID, { status: undefined, skip: 2, take: 3 });
    expect(repo.findReceived).not.toHaveBeenCalled();
    expect(result.items).toHaveLength(2);
    expect(result.hasNextPage).toBe(true);
  });

  it('side received pede só as recebidas, com o status', async () => {
    const { service, readers } = setup();
    const repo = readers;

    const result = await service.listMinePage(OWNER_ID, 'received', 'PROPOSED', { page: 1, limit: 20 });

    expect(repo.findReceived).toHaveBeenCalledWith(OWNER_ID, { status: 'PROPOSED', skip: 0, take: 21 });
    expect(repo.findSent).not.toHaveBeenCalled();
    expect(result).toEqual({ items: [], hasNextPage: false });
  });
});
