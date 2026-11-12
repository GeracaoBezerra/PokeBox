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
  };
  const listings = {
    findById: jest.fn<UnitListings['findById']>(async () => listing),
    findOpenByItem: jest.fn<UnitListings['findOpenByItem']>(async () => []),
  };
  const trades = {
    create: jest.fn<UnitTrades['create']>(),
    findByOfferId: jest.fn<UnitTrades['findByOfferId']>(async () => null),
    lockById: jest.fn<UnitTrades['lockById']>(async () => null),
    updateStatus: jest.fn<UnitTrades['updateStatus']>(),
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
    listingChanges: { apply: jest.fn<TradeUnitOfWork['listingChanges']['apply']>() },
    lockItemsInOrder,
  };
  const readers: OfferReader = {
    findById: offers.findById,
    findSent: jest.fn<OfferReader['findSent']>(async () => []),
    findReceived: jest.fn<OfferReader['findReceived']>(async () => []),
  };
  const unitOfWork = new FakeUnitOfWorkFactory(uow);
  const service = new OfferService({ listings, offers: readers, unitOfWork });

  return { service, offers, listings, trades, lockItemsInOrder, unitOfWork };
}

describe('changeStatus em oferta aceita', () => {
  it.each([
    ['proponente cancela', PROPOSER_ID, 'CANCELED'],
    ['dono recusa', OWNER_ID, 'REJECTED'],
  ] as const)('%s quando ainda não virou troca: solta as cartas e muda o status', async (_, userId, nextStatus) => {
    const { service, offers, trades, unitOfWork } = setup();

    const result = await service.changeStatus(userId, OFFER_ID, nextStatus);

    expect(unitOfWork.runs).toBe(1);
    expect(trades.findByOfferId).toHaveBeenCalledWith(OFFER_ID);
    expect(offers.deleteItems).toHaveBeenCalledWith(OFFER_ID);
    expect(offers.updateStatus).toHaveBeenCalledWith(OFFER_ID, nextStatus);
    expect(result.status).toBe(nextStatus);
  });

  it('oferta que já virou troca dá 409 e nada é escrito', async () => {
    const { service, offers, trades } = setup();
    trades.findByOfferId.mockResolvedValue({ id: 'trade-id' });

    await expect(service.changeStatus(PROPOSER_ID, OFFER_ID, 'CANCELED')).rejects.toMatchObject({ statusCode: 409 });

    expect(offers.deleteItems).not.toHaveBeenCalled();
    expect(offers.updateStatus).not.toHaveBeenCalled();
  });

  it('oferta que não existe dá 404 sem abrir a transação', async () => {
    const { service, offers, unitOfWork } = setup();
    offers.findById.mockResolvedValueOnce(null);

    await expect(service.changeStatus(OWNER_ID, OFFER_ID, 'REJECTED')).rejects.toMatchObject({ statusCode: 404 });
    expect(unitOfWork.runs).toBe(0);
  });
});

describe('changeStatus para ACCEPTED (RN-08)', () => {
  it('trava o item do anúncio e os oferecidos antes de aceitar', async () => {
    const { service, offers, lockItemsInOrder } = setup();
    offers.lockById.mockResolvedValue({ ...accepted, status: 'PROPOSED' });

    await service.changeStatus(OWNER_ID, OFFER_ID, 'ACCEPTED');

    expect(lockItemsInOrder).toHaveBeenCalledWith(['item-owner']);
    expect(offers.deleteItems).not.toHaveBeenCalled();
    expect(offers.updateStatus).toHaveBeenCalledWith(OFFER_ID, 'ACCEPTED');
  });

  it('anúncio pausado não aceita oferta: 422', async () => {
    const { service, offers, listings } = setup();
    offers.lockById.mockResolvedValue({ ...accepted, status: 'PROPOSED' });
    listings.findById.mockResolvedValue({ ...listing, status: 'PAUSED' });

    await expect(service.changeStatus(OWNER_ID, OFFER_ID, 'ACCEPTED')).rejects.toMatchObject({ statusCode: 422 });
    expect(offers.updateStatus).not.toHaveBeenCalled();
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

  it('anúncio que não aparece para quem oferta dá 404 sem abrir a transação', async () => {
    const { service, listings, unitOfWork } = setup();
    listings.findById.mockResolvedValueOnce({ ...listing, status: 'PAUSED' });

    await expect(service.create(proposer, LISTING_ID, input)).rejects.toMatchObject({ statusCode: 404 });
    expect(unitOfWork.runs).toBe(0);
  });
});
