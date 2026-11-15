import type { CardCondition, CardFinish, ListingStatus, Prisma } from '../generated/prisma/index.js';
import type { Db } from '../lib/prisma.js';
import type { ListingCounts } from '../utils/collectionRules.js';
import type { CardType, ListingSort } from '../utils/listingSearch.js';

export const listingInclude = {
  collectionItem: {
    include: {
      card: true,
      user: { select: { username: true, name: true, accountStatus: true, deletedAt: true } },
    },
  },
} satisfies Prisma.ListingInclude;

export type ListingWithItem = Prisma.ListingGetPayload<{ include: typeof listingInclude }>;

export interface ActiveListingFilters {
  cardId?: string;
  username?: string;
  q?: string;
  condition?: CardCondition;
  finish?: CardFinish;
  firstEdition?: boolean;
  setId?: string;
  type?: CardType;
  rarity?: string;
  sort?: ListingSort;
  skip?: number;
  take?: number;
}

export interface OpenListing {
  id: string;
  quantity: number;
  status: ListingStatus;
}

export interface NewListing {
  collectionItemId: string;
  quantity: number;
  description?: string | null;
}

export interface ListingChanges {
  quantity?: number;
  description?: string | null;
  status?: ListingStatus;
}

export interface ListingRepository {
  findActive(filters: ActiveListingFilters): Promise<ListingWithItem[]>;
  findByOwner(userId: string): Promise<ListingWithItem[]>;
  findById(id: string, db?: Db): Promise<ListingWithItem | null>;
  findOpenByItem(collectionItemId: string, db?: Db): Promise<OpenListing[]>;
  sumOpenByItem(collectionItemId: string, db?: Db, exceptId?: string): Promise<number>;
  countByItem(collectionItemId: string, db?: Db): Promise<ListingCounts>;
  create(data: NewListing, db?: Db): Promise<ListingWithItem>;
  update(id: string, data: ListingChanges, db?: Db): Promise<ListingWithItem>;
  existsActiveByUserAndCard(userId: string, cardId: string): Promise<{ id: string } | null>;
}

export type ListingCounter = Pick<ListingRepository, 'sumOpenByItem' | 'countByItem'>;

export type ListingLookup = Pick<ListingRepository, 'existsActiveByUserAndCard'>;

export type ListingUpdater = Pick<ListingRepository, 'update'>;

export type ListingReader = Pick<ListingRepository, 'findById'>;
