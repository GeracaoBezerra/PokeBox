import { jest } from '@jest/globals';

import type { LockedCollectionItem } from '../repositories/CollectionRepository.js';
import type { ListingWithItem, OpenListing } from '../repositories/ListingRepository.js';
import type { OfferWithDetails } from '../repositories/OfferRepository.js';
import type { TradeWithItems } from '../repositories/TradeRepository.js';
import type {
  TradeUnitOfWork,
  UnitCollection,
  UnitListingChanges,
  UnitListings,
  UnitOffers,
  UnitOfWorkFactory,
  UnitTrades,
} from '../repositories/UnitOfWork.js';
import { TradeOpener } from './TradeOpener.js';
import { TradeService, type TradeServiceDeps } from './TradeService.js';

const OWNER_ID = 'owner-id';
const PROPOSER_ID = 'proposer-id';
const TRADE_ID = 'trade-id';
const OFFER_ID = 'offer-id';

class FakeUnitOfWorkFactory implements UnitOfWorkFactory {
  runs = 0;

  constructor(private readonly uow: TradeUnitOfWork) {}

  run<T>(work: (uow: TradeUnitOfWork) => Promise<T>): Promise<T> {
    this.runs += 1;
    return work(this.uow);
  }
}

const lockedItem = (id: string, userId: string, quantity = 1, reservedQuantity = 1): LockedCollectionItem => ({
  id,
  userId,
  cardId: 'base1-4',
  quantity,
  reservedQuantity,
  condition: 'NEAR_MINT',
});

const items: Record<string, LockedCollectionItem> = {
  'item-owner': lockedItem('item-owner', OWNER_ID),
  'item-proposer': lockedItem('item-proposer', PROPOSER_ID),
};

const tradeItem = (collectionItemId: string, fromUserId: string, toUserId: string) => ({
  id: `ti-${collectionItemId}`,
  tradeId: TRADE_ID,
  collectionItemId,
  fromUserId,
  toUserId,
  cardId: 'base1-4',
  condition: 'NEAR_MINT' as const,
  finish: 'HOLO' as const,
  firstEdition: false,
  quantity: 1,
  card: { id: 'base1-4', name: 'Charizard', marketPrice: null },
  fromUser: { username: fromUserId },
  toUser: { username: toUserId },
});

const trade = {
  id: TRADE_ID,
  status: 'PROPOSED',
  proposerId: PROPOSER_ID,
  recipientId: OWNER_ID,
  offerId: OFFER_ID,
  createdAt: new Date(),
  completedAt: null,
  proposerConfirmedAt: null,
  recipientConfirmedAt: null,
  proposer: { username: 'misty', name: 'Misty' },
  recipient: { username: 'ash', name: 'Ash' },
  items: [tradeItem('item-owner', OWNER_ID, PROPOSER_ID), tradeItem('item-proposer', PROPOSER_ID, OWNER_ID)],
} as unknown as TradeWithItems;

const confirmedByProposer = { ...trade, proposerConfirmedAt: new Date('2026-11-20T10:00:00Z') } as TradeWithItems;

const listing = {
  id: 'listing-id',
  collectionItemId: 'item-owner',
  quantity: 2,
  status: 'ACTIVE',
  collectionItem: {
    id: 'item-owner',
    userId: OWNER_ID,
    cardId: 'base1-4',
    condition: 'NEAR_MINT',
    finish: 'HOLO',
    firstEdition: false,
  },
} as unknown as ListingWithItem;

const offer = {
  id: OFFER_ID,
  status: 'ACCEPTED',
  listingId: 'listing-id',
  proposerId: PROPOSER_ID,
  quantity: 1,
  listing,
  items: [
    {
      collectionItemId: 'item-proposer',
      quantity: 1,
      collectionItem: {
        id: 'item-proposer',
        userId: PROPOSER_ID,
        cardId: 'base1-8',
        condition: 'NEAR_MINT',
        finish: 'HOLO',
        firstEdition: false,
      },
    },
  ],
} as unknown as OfferWithDetails;

function setup() {
  const collection = {
    reserve: jest.fn<UnitCollection['reserve']>(async () => undefined),
    release: jest.fn<UnitCollection['release']>(async () => undefined),
    transferOut: jest.fn<UnitCollection['transferOut']>(async () => undefined),
    addOrIncrement: jest.fn<UnitCollection['addOrIncrement']>(),
  };
  const trades = {
    create: jest.fn<UnitTrades['create']>(async () => trade),
    findByOfferId: jest.fn<UnitTrades['findByOfferId']>(async () => null),
    lockById: jest.fn<UnitTrades['lockById']>(async () => confirmedByProposer),
    updateStatus: jest.fn<UnitTrades['updateStatus']>(async (_id, status) => ({ ...trade, status })),
    confirm: jest.fn<UnitTrades['confirm']>(async (_id, role, completes) => ({
      ...trade,
      status: completes ? 'ACCEPTED' : 'PROPOSED',
      ...(role === 'recipient' ? { recipientConfirmedAt: new Date() } : { proposerConfirmedAt: new Date() }),
    })),
    addHolds: jest.fn<UnitTrades['addHolds']>(async () => undefined),
    findHolds: jest.fn<UnitTrades['findHolds']>(async () => [{ listingId: 'listing-id', quantity: 1 }]),
    countOpenHolds: jest.fn<UnitTrades['countOpenHolds']>(async () => 0),
    hasOpenFor: jest.fn<UnitTrades['hasOpenFor']>(async () => false),
  };
  const offers = {
    create: jest.fn<UnitOffers['create']>(),
    findById: jest.fn<UnitOffers['findById']>(async () => offer),
    lockById: jest.fn<UnitOffers['lockById']>(async () => ({
      id: OFFER_ID,
      status: 'ACCEPTED',
      listingId: 'listing-id',
      proposerId: PROPOSER_ID,
    })),
    findOpenByProposerAndListing: jest.fn<UnitOffers['findOpenByProposerAndListing']>(),
    updateStatus: jest.fn<UnitOffers['updateStatus']>(),
    cancelOpenOfUser: jest.fn<UnitOffers['cancelOpenOfUser']>(async () => 0),
  };
  const listings = {
    findById: jest.fn<UnitListings['findById']>(async () => listing),
    findOpenByItem: jest.fn<UnitListings['findOpenByItem']>(async (): Promise<OpenListing[]> => []),
    closeOpenByOwner: jest.fn<UnitListings['closeOpenByOwner']>(async () => 0),
  };
  const listingChanges = { apply: jest.fn<UnitListingChanges['apply']>(async () => listing) };
  const wishlist = { removeByUserAndCard: jest.fn<TradeUnitOfWork['wishlist']['removeByUserAndCard']>(async () => true) };
  const lockItemsInOrder = jest.fn<TradeUnitOfWork['lockItemsInOrder']>(
    async (ids) => new Map(ids.map((id) => [id, items[id] ?? null])),
  );

  const unitOfWork = new FakeUnitOfWorkFactory({
    collection,
    listings,
    offers,
    trades,
    wishlist,
    users: { deactivate: jest.fn<TradeUnitOfWork['users']['deactivate']>() },
    listingChanges,
    lockItemsInOrder,
  });
  const readers: Omit<TradeServiceDeps, 'unitOfWork' | 'opener'> = {
    offers: { findById: offers.findById },
    trades: {
      findById: jest.fn<TradeServiceDeps['trades']['findById']>(async () => trade),
      findSent: jest.fn<TradeServiceDeps['trades']['findSent']>(async () => []),
      findReceived: jest.fn<TradeServiceDeps['trades']['findReceived']>(async () => []),
    },
    collection: { findIdsByKeys: jest.fn<TradeServiceDeps['collection']['findIdsByKeys']>(async () => []) },
  };
  const service = new TradeService({ ...readers, unitOfWork, opener: new TradeOpener() });

  return { service, collection, trades, offers, listings, listingChanges, wishlist, lockItemsInOrder, readers, unitOfWork };
}

describe('accept: confirmar o recebimento', () => {
  it.each([
    ['dono', OWNER_ID, 'recipient'],
    ['quem ofertou', PROPOSER_ID, 'proposer'],
  ] as const)('primeira confirmação (%s) só grava a data, sem mexer nas coleções', async (_, userId, role) => {
    const { service, trades, collection } = setup();
    trades.lockById.mockResolvedValue(trade);

    const result = await service.accept(userId, TRADE_ID);

    expect(trades.confirm).toHaveBeenCalledWith(TRADE_ID, role, false);
    expect(collection.transferOut).not.toHaveBeenCalled();
    expect(result.status).toBe('PROPOSED');
  });

  it('confirmar de novo dá 409', async () => {
    const { service, trades } = setup();

    await expect(service.accept(PROPOSER_ID, TRADE_ID)).rejects.toMatchObject({ statusCode: 409 });
    expect(trades.confirm).not.toHaveBeenCalled();
  });

  it('troca finalizada dá 409', async () => {
    const { service, trades } = setup();
    trades.lockById.mockResolvedValue({ ...trade, status: 'CANCELED' });

    await expect(service.accept(OWNER_ID, TRADE_ID)).rejects.toMatchObject({ statusCode: 409 });
  });

  it('quem não é parte dá 403', async () => {
    const { service } = setup();

    await expect(service.accept('outro', TRADE_ID)).rejects.toMatchObject({ statusCode: 403 });
  });
});

describe('accept: segunda confirmação conclui (RN-07)', () => {
  it('erro no meio da transferência é propagado e a troca não vira ACCEPTED', async () => {
    const { service, collection, trades } = setup();
    collection.transferOut.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('falha forçada'));

    await expect(service.accept(OWNER_ID, TRADE_ID)).rejects.toThrow('falha forçada');

    expect(collection.transferOut).toHaveBeenCalledTimes(2);
    expect(trades.confirm).not.toHaveBeenCalled();
  });

  it('revalida antes de mexer em qualquer item: item sem reserva dá 422 e nada é escrito', async () => {
    const { service, collection, wishlist, trades } = setup();
    const original = items['item-proposer'];
    items['item-proposer'] = { ...original, reservedQuantity: 0 };

    try {
      await expect(service.accept(OWNER_ID, TRADE_ID)).rejects.toMatchObject({ statusCode: 422 });
    } finally {
      items['item-proposer'] = original;
    }

    expect(collection.transferOut).not.toHaveBeenCalled();
    expect(collection.addOrIncrement).not.toHaveBeenCalled();
    expect(wishlist.removeByUserAndCard).not.toHaveBeenCalled();
    expect(trades.confirm).not.toHaveBeenCalled();
  });

  it('caminho feliz: tira de quem entrega, soma em quem recebe e conclui', async () => {
    const { service, collection, trades, unitOfWork } = setup();

    const result = await service.accept(OWNER_ID, TRADE_ID);

    expect(unitOfWork.runs).toBe(1);
    expect(collection.transferOut).toHaveBeenCalledWith('item-owner', 1);
    expect(collection.transferOut).toHaveBeenCalledWith('item-proposer', 1);
    expect(collection.addOrIncrement).toHaveBeenCalledWith(
      expect.objectContaining({ userId: PROPOSER_ID, cardId: 'base1-4', quantity: 1, isPublic: true }),
    );
    expect(trades.confirm).toHaveBeenCalledWith(TRADE_ID, 'recipient', true);
    expect(result.status).toBe('ACCEPTED');
  });

  it('fecha o anúncio Em troca sem outra troca aberta e cancela as ofertas em espera com o motivo trocado', async () => {
    const { service, listings, listingChanges } = setup();
    const inTrade = { ...listing, status: 'IN_TRADE', quantity: 0 } as ListingWithItem;
    listings.findById.mockResolvedValue(inTrade);

    await service.accept(OWNER_ID, TRADE_ID);

    expect(listingChanges.apply).toHaveBeenCalledWith(inTrade, { status: 'CLOSED' }, undefined, 'LISTING_TRADED');
  });

  it('anúncio Em troca com outra troca aberta continua Em troca', async () => {
    const { service, listings, listingChanges, trades } = setup();
    listings.findById.mockResolvedValue({ ...listing, status: 'IN_TRADE', quantity: 0 } as ListingWithItem);
    trades.countOpenHolds.mockResolvedValue(1);

    await service.accept(OWNER_ID, TRADE_ID);

    expect(listingChanges.apply).not.toHaveBeenCalled();
  });

  it('anúncio que ainda tem unidades fica como está', async () => {
    const { service, listingChanges } = setup();

    await service.accept(OWNER_ID, TRADE_ID);

    expect(listingChanges.apply).not.toHaveBeenCalled();
  });

  it('trava também os itens de quem recebe que já existem, junto com os de quem entrega', async () => {
    const { service, readers, lockItemsInOrder } = setup();
    jest.mocked(readers.collection.findIdsByKeys).mockResolvedValue(['item-dest']);

    await service.accept(OWNER_ID, TRADE_ID);

    expect(readers.collection.findIdsByKeys).toHaveBeenCalledWith([
      expect.objectContaining({ userId: PROPOSER_ID, cardId: 'base1-4', condition: 'NEAR_MINT' }),
      expect.objectContaining({ userId: OWNER_ID, cardId: 'base1-4', condition: 'NEAR_MINT' }),
    ]);
    expect(lockItemsInOrder).toHaveBeenCalledWith(['item-owner', 'item-proposer', 'item-dest']);
  });

  it('RN-11: cada carta recebida sai da wishlist de quem recebe, na mesma unidade de trabalho', async () => {
    const { service, wishlist } = setup();

    await service.accept(OWNER_ID, TRADE_ID);

    expect(wishlist.removeByUserAndCard).toHaveBeenCalledTimes(2);
    expect(wishlist.removeByUserAndCard).toHaveBeenCalledWith(PROPOSER_ID, 'base1-4');
    expect(wishlist.removeByUserAndCard).toHaveBeenCalledWith(OWNER_ID, 'base1-4');
  });

  it('quem ofertou também pode dar a segunda confirmação', async () => {
    const { service, trades } = setup();
    trades.lockById.mockResolvedValue({ ...trade, recipientConfirmedAt: new Date() } as TradeWithItems);

    const result = await service.accept(PROPOSER_ID, TRADE_ID);

    expect(trades.confirm).toHaveBeenCalledWith(TRADE_ID, 'proposer', true);
    expect(result.status).toBe('ACCEPTED');
  });
});

describe('reject e cancel liberam a reserva (RN-08)', () => {
  it('dono recusa: solta a reserva de cada item e marca REJECTED', async () => {
    const { service, collection, trades, lockItemsInOrder } = setup();

    const result = await service.reject(OWNER_ID, TRADE_ID);

    expect(lockItemsInOrder).toHaveBeenCalledWith(['item-owner', 'item-proposer']);
    expect(collection.release).toHaveBeenCalledWith('item-owner', 1);
    expect(collection.release).toHaveBeenCalledWith('item-proposer', 1);
    expect(trades.updateStatus).toHaveBeenCalledWith(TRADE_ID, 'REJECTED');
    expect(result.status).toBe('REJECTED');
  });

  it('devolve a quantidade guardada ao anúncio; Em troca volta a ativo', async () => {
    const { service, listings, listingChanges } = setup();
    const inTrade = { ...listing, status: 'IN_TRADE', quantity: 0 } as ListingWithItem;
    listings.findById.mockResolvedValue(inTrade);

    await service.cancel(PROPOSER_ID, TRADE_ID);

    expect(listingChanges.apply).toHaveBeenCalledWith(inTrade, { quantity: 1, status: 'ACTIVE' });
  });

  it('anúncio pausado recebe a quantidade e continua pausado', async () => {
    const { service, listings, listingChanges } = setup();
    const paused = { ...listing, status: 'PAUSED', quantity: 0 } as ListingWithItem;
    listings.findById.mockResolvedValue(paused);

    await service.reject(OWNER_ID, TRADE_ID);

    expect(listingChanges.apply).toHaveBeenCalledWith(paused, { quantity: 1 });
  });

  it.each(['CLOSED', 'BLOCKED'] as const)('anúncio %s no meio-tempo não reabre', async (status) => {
    const { service, listings, listingChanges } = setup();
    listings.findById.mockResolvedValue({ ...listing, status } as ListingWithItem);

    await service.reject(OWNER_ID, TRADE_ID);

    expect(listingChanges.apply).not.toHaveBeenCalled();
  });

  it('desistir vale mesmo depois de ter confirmado', async () => {
    const { service, trades } = setup();

    const result = await service.cancel(PROPOSER_ID, TRADE_ID);

    expect(trades.updateStatus).toHaveBeenCalledWith(TRADE_ID, 'CANCELED');
    expect(result.status).toBe('CANCELED');
  });

  it('dono não pode cancelar: 403 e nada é liberado', async () => {
    const { service, collection } = setup();

    await expect(service.cancel(OWNER_ID, TRADE_ID)).rejects.toMatchObject({ statusCode: 403 });
    expect(collection.release).not.toHaveBeenCalled();
  });
});

describe('create (RN-08)', () => {
  const free = (ids: string[]) =>
    new Map(ids.map((id) => [id, { ...items[id], reservedQuantity: 0 }]));

  it('reserva as cartas, diminui o anúncio pelo ListingChangeApplier e solta os itens da oferta', async () => {
    const { service, collection, trades, offers, listingChanges, lockItemsInOrder } = setup();
    lockItemsInOrder.mockImplementation(async (ids) => free(ids));

    await service.create(PROPOSER_ID, OFFER_ID);

    expect(trades.create).toHaveBeenCalledWith(
      expect.objectContaining({ proposerId: PROPOSER_ID, recipientId: OWNER_ID, offerId: OFFER_ID }),
    );
    expect(collection.reserve).toHaveBeenCalledWith('item-owner', 1);
    expect(collection.reserve).toHaveBeenCalledWith('item-proposer', 1);
    expect(listingChanges.apply).toHaveBeenCalledWith(listing, { quantity: 1 });
    expect(trades.addHolds).toHaveBeenCalledWith(TRADE_ID, [{ listingId: 'listing-id', quantity: 1 }]);
  });

  it('anúncio que chega a 0 vira Em troca', async () => {
    const { service, listings, listingChanges, lockItemsInOrder } = setup();
    lockItemsInOrder.mockImplementation(async (ids) => free(ids));
    const single = { ...listing, quantity: 1 } as ListingWithItem;
    listings.findById.mockResolvedValue(single);

    await service.create(PROPOSER_ID, OFFER_ID);

    expect(listingChanges.apply).toHaveBeenCalledWith(single, { quantity: 0, status: 'IN_TRADE' });
  });

  it('corta os anúncios de quem ofertou que passaram do disponível', async () => {
    const { service, listings, listingChanges, lockItemsInOrder, trades } = setup();
    lockItemsInOrder.mockImplementation(async (ids) => free(ids));
    const proposerListing: OpenListing = { id: 'anuncio-misty', quantity: 1, status: 'ACTIVE' };
    listings.findOpenByItem.mockResolvedValueOnce([proposerListing]);

    await service.create(PROPOSER_ID, OFFER_ID);

    expect(listings.findOpenByItem).toHaveBeenCalledWith('item-proposer');
    expect(listingChanges.apply).toHaveBeenCalledWith(proposerListing, { quantity: 0, status: 'IN_TRADE' });
    expect(trades.addHolds).toHaveBeenCalledWith(TRADE_ID, [
      { listingId: 'listing-id', quantity: 1 },
      { listingId: 'anuncio-misty', quantity: 1 },
    ]);
  });

  it('oferta que já virou troca dá 409 e nada é reservado', async () => {
    const { service, trades, collection, lockItemsInOrder } = setup();
    lockItemsInOrder.mockImplementation(async (ids) => free(ids));
    trades.findByOfferId.mockResolvedValue({ id: 'trade-antiga' });

    await expect(service.create(PROPOSER_ID, OFFER_ID)).rejects.toMatchObject({ statusCode: 409 });
    expect(collection.reserve).not.toHaveBeenCalled();
  });

  it('dono do anúncio não cria a troca: 403 sem abrir a unidade de trabalho', async () => {
    const { service, unitOfWork } = setup();

    await expect(service.create(OWNER_ID, OFFER_ID)).rejects.toMatchObject({ statusCode: 403 });
    expect(unitOfWork.runs).toBe(0);
  });
});

describe('listMine e listMinePage', () => {
  it('sem paginação busca os dois lados inteiros, só com o status', async () => {
    const { service, readers } = setup();
    const repo = readers.trades;
    jest.mocked(repo.findSent).mockResolvedValueOnce([trade]);

    const result = await service.listMine(OWNER_ID, 'ACCEPTED');

    expect(repo.findSent).toHaveBeenCalledWith(OWNER_ID, { status: 'ACCEPTED' });
    expect(repo.findReceived).toHaveBeenCalledWith(OWNER_ID, { status: 'ACCEPTED' });
    expect(result.sent).toHaveLength(1);
    expect(result.received).toEqual([]);
  });

  it('side sent pede skip/take só das enviadas', async () => {
    const { service, readers } = setup();
    const repo = readers.trades;
    jest.mocked(repo.findSent).mockResolvedValueOnce([trade, trade, trade]);

    const result = await service.listMinePage(OWNER_ID, 'sent', undefined, { page: 2, limit: 2 });

    expect(repo.findSent).toHaveBeenCalledWith(OWNER_ID, { status: undefined, skip: 2, take: 3 });
    expect(repo.findReceived).not.toHaveBeenCalled();
    expect(result.items).toHaveLength(2);
    expect(result.hasNextPage).toBe(true);
  });

  it('side received pede só as recebidas, com o status', async () => {
    const { service, readers } = setup();
    const repo = readers.trades;

    const result = await service.listMinePage(OWNER_ID, 'received', 'ACCEPTED', { page: 1, limit: 20 });

    expect(repo.findReceived).toHaveBeenCalledWith(OWNER_ID, { status: 'ACCEPTED', skip: 0, take: 21 });
    expect(repo.findSent).not.toHaveBeenCalled();
    expect(result).toEqual({ items: [], hasNextPage: false });
  });
});
