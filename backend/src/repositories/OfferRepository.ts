import type { OfferCancelReason, OfferStatus, Prisma } from '../generated/prisma/index.js';
import type { Db } from '../lib/prisma.js';
import type { OfferCounts } from '../utils/collectionRules.js';
import type { PageWindow } from '../utils/pagination.js';
import { listingInclude } from './ListingRepository.js';

export const offerInclude = {
  trade: { select: { id: true } },
  proposer: { select: { username: true, name: true } },
  listing: { include: listingInclude },
  items: {
    include: { collectionItem: { include: { card: true } } },
    orderBy: { id: 'asc' },
  },
} satisfies Prisma.OfferInclude;

export type OfferWithDetails = Prisma.OfferGetPayload<{ include: typeof offerInclude }>;

export interface LockedOffer {
  id: string;
  status: OfferStatus;
  listingId: string;
  proposerId: string;
}

export interface NewOfferItem {
  collectionItemId: string;
  quantity: number;
}

export interface NewOffer {
  listingId: string;
  proposerId: string;
  quantity: number;
  message?: string | null;
  items: NewOfferItem[];
}

export interface OfferListOptions extends Partial<PageWindow> {
  status?: OfferStatus;
}

export interface OfferRepository {
  create(data: NewOffer, db?: Db): Promise<OfferWithDetails>;
  findById(id: string, db?: Db): Promise<OfferWithDetails | null>;
  lockById(id: string, db?: Db): Promise<LockedOffer | null>;
  findOpenByProposerAndListing(proposerId: string, listingId: string, db?: Db): Promise<{ id: string } | null>;
  findSent(userId: string, options?: OfferListOptions): Promise<OfferWithDetails[]>;
  findReceived(userId: string, options?: OfferListOptions): Promise<OfferWithDetails[]>;
  countByItem(collectionItemId: string, db?: Db): Promise<OfferCounts>;
  updateStatus(id: string, status: OfferStatus, db?: Db, cancelReason?: OfferCancelReason | null): Promise<OfferWithDetails>;
  deleteItems(offerId: string, db?: Db): Promise<void>;
  cancelByIds(ids: string[], reason: OfferCancelReason, db?: Db): Promise<number>;
  cancelOpenByListing(listingId: string, reason: OfferCancelReason, db?: Db): Promise<number>;
  cancelOpenOfUser(userId: string, reason: OfferCancelReason, db?: Db): Promise<number>;
}

export type OfferCounter = Pick<OfferRepository, 'countByItem'>;

export type ListingOfferCanceller = Pick<OfferRepository, 'cancelOpenByListing'>;
