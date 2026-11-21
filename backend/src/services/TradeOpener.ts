import { NotFoundError } from '../errors/domainErrors.js';
import type { LockedCollectionItem } from '../repositories/CollectionRepository.js';
import type { ListingWithItem } from '../repositories/ListingRepository.js';
import type { OfferWithDetails } from '../repositories/OfferRepository.js';
import type { TradeWithItems } from '../repositories/TradeRepository.js';
import type { TradeUnitOfWork } from '../repositories/UnitOfWork.js';
import { assertStillFulfillable, offeredItems } from '../utils/offerRules.js';
import { buildTradeItems, nextListingState, trimListings, type ListingHold } from '../utils/tradeRules.js';

export interface OpenTradeInput {
  offer: OfferWithDetails;
  listing: ListingWithItem;
  locked: Map<string, LockedCollectionItem | null>;
}

const ITEM_NOT_FOUND = 'Item da coleção não encontrado';

export function lockedOrFail(locked: Map<string, LockedCollectionItem | null>, id: string): LockedCollectionItem {
  const item = locked.get(id);
  if (!item) throw new NotFoundError(ITEM_NOT_FOUND);
  return item;
}

export class TradeOpener {
  async open(uow: TradeUnitOfWork, { offer, listing, locked }: OpenTradeInput): Promise<TradeWithItems> {
    const offered = offeredItems(offer);
    assertStillFulfillable({
      offerQuantity: offer.quantity,
      listing,
      offeredItems: offered.map((item) => ({
        item: lockedOrFail(locked, item.collectionItem.id),
        requested: item.quantity,
      })),
    });

    const items = buildTradeItems({ offer: { ...offer, items: offered }, listing });
    const trade = await uow.trades.create({
      proposerId: offer.proposerId,
      recipientId: listing.collectionItem.userId,
      offerId: offer.id,
      items,
    });

    for (const { collectionItemId, quantity } of items) {
      await uow.collection.reserve(collectionItemId, quantity);
    }

    await uow.listingChanges.apply(listing, nextListingState({ listing, taken: offer.quantity }));
    const holds: ListingHold[] = [{ listingId: listing.id, quantity: offer.quantity }];

    for (const { collectionItem, quantity } of offered) {
      const item = lockedOrFail(locked, collectionItem.id);
      holds.push(...(await this.trimProposerListings(uow, item, item.reservedQuantity + quantity)));
    }

    await uow.trades.addHolds(trade.id, holds);

    return trade;
  }

  private async trimProposerListings(
    uow: TradeUnitOfWork,
    item: LockedCollectionItem,
    reserved: number,
  ): Promise<ListingHold[]> {
    const listings = await uow.listings.findOpenByItem(item.id);
    const changes = trimListings({ listings, available: item.quantity - reserved });
    const holds: ListingHold[] = [];

    for (const { id, taken, ...change } of changes) {
      const current = listings.find((listing) => listing.id === id);
      if (!current) continue;
      await uow.listingChanges.apply(current, change);
      holds.push({ listingId: id, quantity: taken });
    }

    return holds;
  }
}
