import { toCardResponse } from './cardRecord.js';

export function countOwnersByCard(owners) {
  const counts = new Map();
  for (const { cardId } of owners) {
    counts.set(cardId, (counts.get(cardId) ?? 0) + 1);
  }
  return counts;
}

export function toWishlistItemResponse(item, ownersByCard = new Map()) {
  return {
    id: item.id,
    cardId: item.cardId,
    card: toCardResponse(item.card),
    createdAt: item.createdAt,
    opportunities: ownersByCard.get(item.cardId) ?? 0,
  };
}
