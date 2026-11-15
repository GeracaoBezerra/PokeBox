import { NotFoundError } from '../errors/domainErrors.js';
import type { TradeStatus } from '../generated/prisma/index.js';
import type { CollectionItemKey, CollectionRepository, LockedCollectionItem } from '../repositories/CollectionRepository.js';
import type { OfferRepository } from '../repositories/OfferRepository.js';
import type { LockedTrade, TradeRepository, TradeWithItems } from '../repositories/TradeRepository.js';
import type { TradeUnitOfWork, UnitOfWorkFactory } from '../repositories/UnitOfWork.js';
import { assertStillFulfillable } from '../utils/offerRules.js';
import {
  TRADE_ACTIONS,
  assertCanCreate,
  assertCanView,
  assertOfferTradable,
  assertStillTradable,
  assertTradeAction,
  buildTradeItems,
  nextListingState,
  toTradeResponse,
  trimListings,
  type TradeAction,
  type TradeResponse,
} from '../utils/tradeRules.js';

export interface TradeServiceDeps {
  offers: Pick<OfferRepository, 'findById'>;
  trades: Pick<TradeRepository, 'findById' | 'findSent' | 'findReceived'>;
  collection: Pick<CollectionRepository, 'findIdsByKeys'>;
  unitOfWork: UnitOfWorkFactory;
}

export type TradeView = TradeResponse<TradeWithItems['items'][number]['card']>;

export interface MyTrades {
  sent: TradeView[];
  received: TradeView[];
}

const OFFER_NOT_FOUND = 'Oferta não encontrada';
const TRADE_NOT_FOUND = 'Troca não encontrada';
const ITEM_NOT_FOUND = 'Item da coleção não encontrado';

function originIds(trade: TradeWithItems): string[] {
  return trade.items.flatMap((item) => (item.collectionItemId ? [item.collectionItemId] : []));
}

function destinationKeys(trade: TradeWithItems): CollectionItemKey[] {
  return trade.items.map(({ toUserId, cardId, condition, finish, firstEdition }) => ({
    userId: toUserId,
    cardId,
    condition,
    finish,
    firstEdition,
  }));
}

function lockedOrFail(locked: Map<string, LockedCollectionItem | null>, id: string): LockedCollectionItem {
  const item = locked.get(id);
  if (!item) throw new NotFoundError(ITEM_NOT_FOUND);
  return item;
}

export class TradeService {
  constructor(private readonly deps: TradeServiceDeps) {}

  async create(userId: string, offerId: string): Promise<TradeView> {
    const found = await this.deps.offers.findById(offerId);
    if (!found) throw new NotFoundError(OFFER_NOT_FOUND);
    assertCanCreate({ offer: found, userId });

    const trade = await this.deps.unitOfWork.run(async (uow) => {
      const offeredIds = found.items.map((item) => item.collectionItemId);
      const locked = await uow.lockItemsInOrder([found.listing.collectionItemId, ...offeredIds]);

      if (!(await uow.offers.lockById(offerId))) throw new NotFoundError(OFFER_NOT_FOUND);
      const offer = await uow.offers.findById(offerId);
      if (!offer) throw new NotFoundError(OFFER_NOT_FOUND);
      const listing = await uow.listings.findById(offer.listingId);
      if (!listing) throw new NotFoundError(OFFER_NOT_FOUND);

      assertOfferTradable({
        offer,
        hasTrade: Boolean(await uow.trades.findByOfferId(offerId)),
        listing,
      });
      assertStillFulfillable({
        offerQuantity: offer.quantity,
        listing,
        offeredItems: offer.items.map((item) => ({
          item: lockedOrFail(locked, item.collectionItemId),
          requested: item.quantity,
        })),
      });

      const items = buildTradeItems({ offer, listing });
      const created = await uow.trades.create({
        proposerId: offer.proposerId,
        recipientId: listing.collectionItem.userId,
        offerId,
        items,
      });

      for (const { collectionItemId, quantity } of items) {
        await uow.collection.reserve(collectionItemId, quantity);
      }

      await uow.listingChanges.apply(listing, nextListingState({ listing, taken: offer.quantity }));

      for (const { collectionItem, quantity } of offer.items) {
        const item = lockedOrFail(locked, collectionItem.id);
        await this.trimProposerListings(uow, { ...item, reservedQuantity: item.reservedQuantity + quantity });
      }

      await uow.offers.deleteItems(offerId);

      return created;
    });

    return toTradeResponse(trade);
  }

  async listMine(userId: string, status?: TradeStatus): Promise<MyTrades> {
    const [sent, received] = await Promise.all([
      this.deps.trades.findSent(userId, status),
      this.deps.trades.findReceived(userId, status),
    ]);

    return {
      sent: sent.map((trade) => toTradeResponse(trade)),
      received: received.map((trade) => toTradeResponse(trade)),
    };
  }

  async getById(userId: string, id: string): Promise<TradeView> {
    return toTradeResponse(await this.findTradeOf(userId, id));
  }

  async accept(userId: string, id: string): Promise<TradeView> {
    const found = await this.findTradeOf(userId, id);
    const destinationIds = await this.deps.collection.findIdsByKeys(destinationKeys(found));

    const trade = await this.deps.unitOfWork.run(async (uow) => {
      const locked = await uow.lockItemsInOrder([...originIds(found), ...destinationIds]);
      assertTradeAction({ trade: await this.lockTrade(uow, id), userId, action: 'accept' });

      const transfers = found.items.map((tradeItem) => {
        const check = { item: tradeItem.collectionItemId ? locked.get(tradeItem.collectionItemId) : null, tradeItem };
        assertStillTradable(check);
        return { tradeItem, collectionItemId: check.item.id };
      });

      for (const { tradeItem, collectionItemId } of transfers) {
        await uow.collection.transferOut(collectionItemId, tradeItem.quantity);
        await uow.collection.addOrIncrement({
          userId: tradeItem.toUserId,
          cardId: tradeItem.cardId,
          condition: tradeItem.condition,
          finish: tradeItem.finish,
          firstEdition: tradeItem.firstEdition,
          quantity: tradeItem.quantity,
          isPublic: true,
        });
        await uow.wishlist.removeByUserAndCard(tradeItem.toUserId, tradeItem.cardId);
      }

      return uow.trades.updateStatus(id, TRADE_ACTIONS.accept.status);
    });

    return toTradeResponse(trade);
  }

  reject(userId: string, id: string): Promise<TradeView> {
    return this.undo(userId, id, 'reject');
  }

  cancel(userId: string, id: string): Promise<TradeView> {
    return this.undo(userId, id, 'cancel');
  }

  private async undo(userId: string, id: string, action: Exclude<TradeAction, 'accept'>): Promise<TradeView> {
    const found = await this.findTradeOf(userId, id);

    const trade = await this.deps.unitOfWork.run(async (uow) => {
      await uow.lockItemsInOrder(originIds(found));
      assertTradeAction({ trade: await this.lockTrade(uow, id), userId, action });

      for (const tradeItem of found.items) {
        if (tradeItem.collectionItemId) {
          await uow.collection.release(tradeItem.collectionItemId, tradeItem.quantity);
        }
      }

      return uow.trades.updateStatus(id, TRADE_ACTIONS[action].status);
    });

    return toTradeResponse(trade);
  }

  private async findTradeOf(userId: string, id: string): Promise<TradeWithItems> {
    const trade = await this.deps.trades.findById(id);
    if (!trade) throw new NotFoundError(TRADE_NOT_FOUND);
    assertCanView(trade, userId);
    return trade;
  }

  private async lockTrade(uow: TradeUnitOfWork, id: string): Promise<LockedTrade> {
    const locked = await uow.trades.lockById(id);
    if (!locked) throw new NotFoundError(TRADE_NOT_FOUND);
    return locked;
  }

  private async trimProposerListings(uow: TradeUnitOfWork, item: LockedCollectionItem): Promise<void> {
    const listings = await uow.listings.findOpenByItem(item.id);
    const changes = trimListings({ listings, available: item.quantity - item.reservedQuantity });

    for (const { id, ...change } of changes) {
      const current = listings.find((listing) => listing.id === id);
      if (current) await uow.listingChanges.apply(current, change);
    }
  }
}
