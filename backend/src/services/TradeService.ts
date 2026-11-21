import { NotFoundError } from '../errors/domainErrors.js';
import { withSpan } from '../lib/tracing.js';
import type { TradeStatus } from '../generated/prisma/index.js';
import type { CollectionItemKey, CollectionRepository } from '../repositories/CollectionRepository.js';
import type { OfferRepository } from '../repositories/OfferRepository.js';
import type { LockedTrade, TradeRepository, TradeWithItems } from '../repositories/TradeRepository.js';
import type { TradeUnitOfWork, UnitOfWorkFactory } from '../repositories/UnitOfWork.js';
import { toPage, toSkipTake, type ListSide, type Page, type PageParams } from '../utils/pagination.js';
import {
  TRADE_ACTIONS,
  assertCanConfirm,
  assertCanCreate,
  assertCanView,
  assertOfferTradable,
  assertStillTradable,
  assertTradeAction,
  closesAfterTrade,
  returnedListingState,
  toTradeResponse,
  type TradeAction,
  type TradeResponse,
} from '../utils/tradeRules.js';
import type { TradeOpener } from './TradeOpener.js';

export interface TradeServiceDeps {
  offers: Pick<OfferRepository, 'findById'>;
  trades: Pick<TradeRepository, 'findById' | 'findSent' | 'findReceived'>;
  collection: Pick<CollectionRepository, 'findIdsByKeys'>;
  unitOfWork: UnitOfWorkFactory;
  opener: Pick<TradeOpener, 'open'>;
}

export type TradeView = TradeResponse<TradeWithItems['items'][number]['card']>;

export interface MyTrades {
  sent: TradeView[];
  received: TradeView[];
}

const OFFER_NOT_FOUND = 'Oferta não encontrada';
const TRADE_NOT_FOUND = 'Troca não encontrada';

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

export class TradeService {
  constructor(private readonly deps: TradeServiceDeps) {}

  async create(userId: string, offerId: string): Promise<TradeView> {
    const found = await this.deps.offers.findById(offerId);
    if (!found) throw new NotFoundError(OFFER_NOT_FOUND);
    assertCanCreate({ offer: found, userId });

    const trade = await this.deps.unitOfWork.run(async (uow) => {
      const offeredIds = found.items.flatMap((item) => (item.collectionItemId ? [item.collectionItemId] : []));
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

      return this.deps.opener.open(uow, { offer, listing, locked });
    });

    return toTradeResponse(trade);
  }

  async listMine(userId: string, status?: TradeStatus): Promise<MyTrades> {
    const [sent, received] = await Promise.all([
      this.deps.trades.findSent(userId, { status }),
      this.deps.trades.findReceived(userId, { status }),
    ]);

    return {
      sent: sent.map((trade) => toTradeResponse(trade)),
      received: received.map((trade) => toTradeResponse(trade)),
    };
  }

  async listMinePage(userId: string, side: ListSide, status: TradeStatus | undefined, page: PageParams): Promise<Page<TradeView>> {
    const options = { status, ...toSkipTake(page) };
    const rows =
      side === 'sent'
        ? await this.deps.trades.findSent(userId, options)
        : await this.deps.trades.findReceived(userId, options);
    const { items, hasNextPage } = toPage(rows, page);

    return { items: items.map((trade) => toTradeResponse(trade)), hasNextPage };
  }

  async getById(userId: string, id: string): Promise<TradeView> {
    return toTradeResponse(await this.findTradeOf(userId, id));
  }

  accept(userId: string, id: string): Promise<TradeView> {
    return withSpan('trade.accept', { 'trade.id': id }, () => this.confirmTrade(userId, id));
  }

  private async confirmTrade(userId: string, id: string): Promise<TradeView> {
    const found = await this.findTradeOf(userId, id);
    const destinationIds = await this.deps.collection.findIdsByKeys(destinationKeys(found));

    const trade = await this.deps.unitOfWork.run(async (uow) => {
      const locked = await uow.lockItemsInOrder([...originIds(found), ...destinationIds]);
      const { role, completes } = assertCanConfirm({ trade: await this.lockTrade(uow, id), userId });
      if (!completes) return uow.trades.confirm(id, role, false);

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

      const completed = await uow.trades.confirm(id, role, true);
      await this.closeTradedListings(uow, id);
      return completed;
    });

    return toTradeResponse(trade);
  }

  reject(userId: string, id: string): Promise<TradeView> {
    return this.undo(userId, id, 'reject');
  }

  cancel(userId: string, id: string): Promise<TradeView> {
    return this.undo(userId, id, 'cancel');
  }

  private async undo(userId: string, id: string, action: TradeAction): Promise<TradeView> {
    const found = await this.findTradeOf(userId, id);

    const trade = await this.deps.unitOfWork.run(async (uow) => {
      await uow.lockItemsInOrder(originIds(found));
      assertTradeAction({ trade: await this.lockTrade(uow, id), userId, action });

      for (const tradeItem of found.items) {
        if (tradeItem.collectionItemId) {
          await uow.collection.release(tradeItem.collectionItemId, tradeItem.quantity);
        }
      }

      const undone = await uow.trades.updateStatus(id, TRADE_ACTIONS[action].status);
      await this.returnHeldQuantities(uow, id);
      return undone;
    });

    return toTradeResponse(trade);
  }

  private async returnHeldQuantities(uow: TradeUnitOfWork, tradeId: string): Promise<void> {
    for (const hold of await uow.trades.findHolds(tradeId)) {
      const listing = await uow.listings.findById(hold.listingId);
      if (!listing) continue;

      const change = returnedListingState({ listing, quantity: hold.quantity });
      if (change) await uow.listingChanges.apply(listing, change);
    }
  }

  private async closeTradedListings(uow: TradeUnitOfWork, tradeId: string): Promise<void> {
    for (const hold of await uow.trades.findHolds(tradeId)) {
      const listing = await uow.listings.findById(hold.listingId);
      if (!listing) continue;

      const otherOpenHolds = await uow.trades.countOpenHolds(listing.id);
      if (closesAfterTrade({ listing, otherOpenHolds })) {
        await uow.listingChanges.apply(listing, { status: 'CLOSED' }, undefined, 'LISTING_TRADED');
      }
    }
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
}
