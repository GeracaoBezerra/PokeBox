import type { CardCondition, CardFinish, Prisma } from '../generated/prisma/index.js';
import type { Db } from '../lib/prisma.js';
import { OPEN_STATUSES } from '../utils/listingRules.js';
import type { ItemSort } from '../utils/itemSort.js';
import type { CardFilters } from '../utils/listingSearch.js';
import type { PageWindow } from '../utils/pagination.js';

export const collectionItemWithCard = { card: true } satisfies Prisma.CollectionItemInclude;

export type CollectionItemWithCard = Prisma.CollectionItemGetPayload<{ include: typeof collectionItemWithCard }>;

export const openOfferItemWhere = {
  offer: { OR: [{ status: 'PROPOSED' }, { status: 'ACCEPTED', trade: null }] },
} satisfies Prisma.OfferItemWhereInput;

export const collectionItemWithUsage = {
  card: true,
  listings: { select: { status: true } },
  _count: { select: { offerItems: { where: openOfferItemWhere } } },
} satisfies Prisma.CollectionItemInclude;

export type CollectionItemWithUsage = Prisma.CollectionItemGetPayload<{ include: typeof collectionItemWithUsage }>;

export interface CollectionSummary {
  totalUnits: number;
  distinctCards: number;
  listedItems: number;
}

export const listedItemWhere = {
  listings: { some: { status: { in: [...OPEN_STATUSES] } } },
} satisfies Prisma.CollectionItemWhereInput;

export interface LockedCollectionItem {
  id: string;
  userId: string;
  cardId: string;
  quantity: number;
  reservedQuantity: number;
  condition: CardCondition;
}

export interface CollectionItemKey {
  userId: string;
  cardId: string;
  condition: CardCondition;
  finish: CardFinish;
  firstEdition: boolean;
}

export interface NewCollectionItem {
  userId: string;
  cardId: string;
  condition?: CardCondition;
  finish: CardFinish;
  firstEdition: boolean;
  quantity: number;
  isPublic?: boolean;
}

export interface CollectionItemChanges {
  quantity?: number;
  condition?: CardCondition;
  isPublic?: boolean;
}

export interface CollectionFilters extends Pick<CardFilters, 'q' | 'setId' | 'type'> {
  condition?: CardCondition;
  finish?: CardFinish;
  isPublic?: boolean;
  withZero?: boolean;
  sort?: ItemSort;
}

export type PublicCollectionFilters = Pick<CardFilters, 'q' | 'type'>;

export interface CardOwner {
  cardId: string;
  userId: string;
}

export interface CollectionRepository {
  findManyByUser(userId: string, options?: CollectionFilters & Partial<PageWindow>): Promise<CollectionItemWithUsage[]>;
  summarizeByUser(userId: string): Promise<CollectionSummary>;
  findPublicByUser(
    userId: string,
    options?: PublicCollectionFilters & Partial<PageWindow>,
  ): Promise<CollectionItemWithCard[]>;
  findById(id: string): Promise<CollectionItemWithCard | null>;
  addOrIncrement(data: NewCollectionItem, db?: Db): Promise<CollectionItemWithCard>;
  findIdsByKeys(keys: CollectionItemKey[]): Promise<string[]>;
  lockById(id: string, db?: Db): Promise<LockedCollectionItem | null>;
  lockInOrder(ids: string[], db?: Db): Promise<Map<string, LockedCollectionItem | null>>;
  update(id: string, data: CollectionItemChanges, db?: Db): Promise<CollectionItemWithCard>;
  reserve(id: string, quantity: number, db?: Db): Promise<void>;
  release(id: string, quantity: number, db?: Db): Promise<void>;
  transferOut(id: string, quantity: number, db?: Db): Promise<void>;
  remove(id: string): Promise<void>;
  findOwnersOfCards(cardIds: string[], userId: string): Promise<CardOwner[]>;
  sumQuantityByUserAndCard(userId: string, cardId: string): Promise<number | null>;
}

export type CollectionLocker = Pick<
  CollectionRepository,
  'lockById' | 'lockInOrder' | 'reserve' | 'release' | 'transferOut' | 'addOrIncrement'
>;

export type CollectionOwnersReader = Pick<CollectionRepository, 'findOwnersOfCards'>;

export type CollectionQuantityReader = Pick<CollectionRepository, 'sumQuantityByUserAndCard'>;

export type PublicCollectionReader = Pick<CollectionRepository, 'findPublicByUser'>;
