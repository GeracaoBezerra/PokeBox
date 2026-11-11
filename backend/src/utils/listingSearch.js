import { tokenize } from './cardSearch.js';

export const LISTING_SORTS = ['recent', 'oldest', 'name'];

export const LISTING_ORDER_BY = {
  recent: [{ createdAt: 'desc' }, { id: 'asc' }],
  oldest: [{ createdAt: 'asc' }, { id: 'asc' }],
  name: [{ collectionItem: { card: { name: 'asc' } } }, { createdAt: 'desc' }, { id: 'asc' }],
};

function matchesWord(word) {
  return {
    OR: [
      { name: { contains: word, mode: 'insensitive' } },
      { setName: { contains: word, mode: 'insensitive' } },
    ],
  };
}

export function cardWhere({ q, setId, type, rarity } = {}) {
  const words = q ? tokenize(q) : [];

  return {
    setId,
    rarity,
    ...(type && { types: { has: type } }),
    ...(words.length > 0 && { AND: words.map(matchesWord) }),
  };
}

export function listingOrderBy(sort = 'recent') {
  return LISTING_ORDER_BY[sort] ?? LISTING_ORDER_BY.recent;
}
