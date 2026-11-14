import type { OfferStatus, Prisma } from '../generated/prisma/index.js';
import type { Db } from '../lib/prisma.js';
import type { OfferCounts } from '../utils/collectionRules.js';
import { listingInclude } from './ListingRepository.js';

export const offerInclude = {
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

export interface AcceptedOffer {
  id: string;
  quantity: number;
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

export interface OfferRepository {
  create(data: NewOffer, db?: Db): Promise<OfferWithDetails>;
  findById(id: string, db?: Db): Promise<OfferWithDetails | null>;
  lockById(id: string, db?: Db): Promise<LockedOffer | null>;
  findOpenByProposerAndListing(proposerId: string, listingId: string, db?: Db): Promise<{ id: string } | null>;
  findSent(userId: string, status?: OfferStatus): Promise<OfferWithDetails[]>;
  findReceived(userId: string, status?: OfferStatus): Promise<OfferWithDetails[]>;
  countByItem(collectionItemId: string, db?: Db): Promise<OfferCounts>;
  updateStatus(id: string, status: OfferStatus, db?: Db): Promise<OfferWithDetails>;
  deleteItems(offerId: string, db?: Db): Promise<void>;
  cancelByIds(ids: string[], db?: Db): Promise<number>;
  cancelOpenByListing(listingId: string, db?: Db): Promise<number>;
  lockAcceptedWithoutTrade(listingId: string, db?: Db): Promise<AcceptedOffer[]>;
}

export type OfferCounter = Pick<OfferRepository, 'countByItem'>;

export type ListingOfferCanceller = Pick<
  OfferRepository,
  'cancelOpenByListing' | 'lockAcceptedWithoutTrade' | 'cancelByIds'
>;
