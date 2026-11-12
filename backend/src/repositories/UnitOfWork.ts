import type { ListingChangeApplier } from '../services/ListingChangeApplier.js';
import type { CollectionRepository, LockedCollectionItem } from './CollectionRepository.js';
import type { ListingRepository } from './ListingRepository.js';
import type { OfferRepository } from './OfferRepository.js';
import type { TradeRepository } from './TradeRepository.js';
import type { WishlistRemover } from './WishlistRepository.js';

export type UnitCollection = Pick<CollectionRepository, 'reserve' | 'release' | 'transferOut' | 'addOrIncrement'>;

export type UnitListings = Pick<ListingRepository, 'findById' | 'findOpenByItem'>;

export type UnitOffers = Pick<
  OfferRepository,
  'create' | 'findById' | 'lockById' | 'findOpenByProposerAndListing' | 'updateStatus' | 'deleteItems'
>;

export type UnitTrades = Pick<TradeRepository, 'create' | 'findByOfferId' | 'lockById' | 'updateStatus'>;

export type UnitListingChanges = Pick<ListingChangeApplier, 'apply'>;

export interface TradeUnitOfWork {
  collection: UnitCollection;
  listings: UnitListings;
  offers: UnitOffers;
  trades: UnitTrades;
  wishlist: WishlistRemover;
  listingChanges: UnitListingChanges;
  lockItemsInOrder(ids: string[]): Promise<Map<string, LockedCollectionItem | null>>;
}

export interface UnitOfWorkFactory {
  run<T>(work: (uow: TradeUnitOfWork) => Promise<T>): Promise<T>;
}
