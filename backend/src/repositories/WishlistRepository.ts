import type { Prisma, WishlistItem } from '../generated/prisma/index.js';
import type { Db } from '../lib/prisma.js';

export const wishlistItemWithCard = { card: true } satisfies Prisma.WishlistItemInclude;

export type WishlistItemWithCard = Prisma.WishlistItemGetPayload<{ include: typeof wishlistItemWithCard }>;

export type { WishlistItem };

export interface NewWishlistItem {
  userId: string;
  cardId: string;
}

export interface WishlistRepository {
  findManyByUser(userId: string): Promise<WishlistItemWithCard[]>;
  findById(id: string): Promise<WishlistItem | null>;
  create(data: NewWishlistItem): Promise<WishlistItemWithCard>;
  remove(id: string): Promise<void>;
  existsByUserAndCard(userId: string, cardId: string): Promise<{ id: string } | null>;
  removeByUserAndCard(userId: string, cardId: string, db?: Db): Promise<boolean>;
}

export type WishlistLookup = Pick<WishlistRepository, 'existsByUserAndCard'>;

export type WishlistRemover = Pick<WishlistRepository, 'removeByUserAndCard'>;
