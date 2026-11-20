import type { OfferCancelReason } from '../generated/prisma/index.js';
import type { Db } from '../lib/prisma.js';
import type { ListingChanges, ListingUpdater, ListingWithItem } from '../repositories/ListingRepository.js';
import type { ListingOfferCanceller } from '../repositories/OfferRepository.js';
import { cancelReasonFor, cancelsOffers, type ListingState } from '../utils/listingRules.js';

export interface CurrentListing extends ListingState {
  id: string;
}

export class ListingChangeApplier {
  constructor(
    private readonly listings: ListingUpdater,
    private readonly offers: ListingOfferCanceller,
  ) {}

  async apply(current: CurrentListing, change: ListingChanges, db?: Db, reason?: OfferCancelReason): Promise<ListingWithItem> {
    const status = change.status ?? current.status;

    if (cancelsOffers(status)) {
      await this.offers.cancelOpenByListing(current.id, reason ?? cancelReasonFor(status), db);
    }

    return this.listings.update(current.id, change, db);
  }
}
