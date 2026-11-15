import type { CardCondition, CardFinish, Prisma } from '../generated/prisma/index.js';
import type { Db } from '../lib/prisma.js';

export const collectionItemWithCard = { card: true } satisfies Prisma.CollectionItemInclude;

export type CollectionItemWithCard = Prisma.CollectionItemGetPayload<{ include: typeof collectionItemWithCard }>;

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

export interface CardOwner {
  cardId: string;
  userId: string;
}

export interface CollectionRepository {
  findManyByUser(userId: string): Promise<CollectionItemWithCard[]>;
  findPublicByUser(userId: string): Promise<CollectionItemWithCard[]>;
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
