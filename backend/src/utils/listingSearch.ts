import type { Prisma } from '../generated/prisma/index.js';
import { tokenize } from './cardSearch.js';

export const CARD_TYPES = [
  'Colorless',
  'Darkness',
  'Dragon',
  'Fairy',
  'Fighting',
  'Fire',
  'Grass',
  'Lightning',
  'Metal',
  'Psychic',
  'Water',
] as const;

export type CardType = (typeof CARD_TYPES)[number];

export const LISTING_SORTS = ['recent', 'oldest', 'name'] as const;

export type ListingSort = (typeof LISTING_SORTS)[number];

export const LISTING_ORDER_BY: Record<ListingSort, Prisma.ListingOrderByWithRelationInput[]> = {
  recent: [{ createdAt: 'desc' }, { id: 'asc' }],
  oldest: [{ createdAt: 'asc' }, { id: 'asc' }],
  name: [{ collectionItem: { card: { name: 'asc' } } }, { createdAt: 'desc' }, { id: 'asc' }],
};

export interface CardFilters {
  q?: string;
  setId?: string;
  type?: CardType;
  rarity?: string;
}

function matchesWord(word: string): Prisma.CardWhereInput {
  return {
    OR: [
      { name: { contains: word, mode: 'insensitive' } },
      { setName: { contains: word, mode: 'insensitive' } },
    ],
  };
}

export function cardWhere({ q, setId, type, rarity }: CardFilters = {}): Prisma.CardWhereInput {
  const words = q ? tokenize(q).filter((word) => /[\p{L}\p{N}]/u.test(word)) : [];
  const where: Prisma.CardWhereInput = { setId };

  if (rarity) where.rarity = { equals: rarity, mode: 'insensitive' };
  if (type) where.types = { has: type };
  if (words.length > 0) where.AND = words.map(matchesWord);

  return where;
}

export function listingOrderBy(sort: ListingSort = 'recent'): Prisma.ListingOrderByWithRelationInput[] {
  return LISTING_ORDER_BY[sort] ?? LISTING_ORDER_BY.recent;
}
