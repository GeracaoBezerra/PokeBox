import type { Db } from '../lib/prisma.js';
import type { ListingChanges, ListingUpdater, ListingWithItem } from '../repositories/ListingRepository.js';
import type { ListingOfferCanceller } from '../repositories/OfferRepository.js';
import { cancelsOffers, mayCancelAccepted, type ListingState } from '../utils/listingRules.js';
import { acceptedOffersToCancel } from '../utils/tradeRules.js';

export interface CurrentListing extends ListingState {
  id: string;
}

export class ListingChangeApplier {
  constructor(
    private readonly listings: ListingUpdater,
    private readonly offers: ListingOfferCanceller,
  ) {}

  async apply(current: CurrentListing, change: ListingChanges, db?: Db): Promise<ListingWithItem> {
    const next: ListingState = {
      quantity: change.quantity ?? current.quantity,
      status: change.status ?? current.status,
    };

    if (cancelsOffers(next.status)) {
      await this.offers.cancelOpenByListing(current.id, db);
    }

    if (mayCancelAccepted(current, next)) {
      const accepted = await this.offers.lockAcceptedWithoutTrade(current.id, db);
      await this.offers.cancelByIds(acceptedOffersToCancel({ offers: accepted, change: next }), db);
    }

    return this.listings.update(current.id, change, db);
  }
}
