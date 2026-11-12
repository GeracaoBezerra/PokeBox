import { toCardResponse } from './cardRecord.js';

export interface CardOwner {
  cardId: string;
  userId: string;
}

export interface WishlistItemSource<C extends { marketPrice: unknown }> {
  id: string;
  cardId: string;
  createdAt: Date;
  card: C;
}

export interface WishlistItemResponse<C extends { marketPrice: unknown }> {
  id: string;
  cardId: string;
  card: Omit<C, 'marketPrice'> & { marketPrice: number | null };
  createdAt: Date;
  opportunities: number;
}

export function countOwnersByCard(owners: CardOwner[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const { cardId } of owners) {
    counts.set(cardId, (counts.get(cardId) ?? 0) + 1);
  }
  return counts;
}

export function toWishlistItemResponse<C extends { marketPrice: unknown }>(
  item: WishlistItemSource<C>,
  ownersByCard: Map<string, number> = new Map(),
): WishlistItemResponse<C> {
  return {
    id: item.id,
    cardId: item.cardId,
    card: toCardResponse(item.card),
    createdAt: item.createdAt,
    opportunities: ownersByCard.get(item.cardId) ?? 0,
  };
}
