import type { CardImage, MarketPrice } from '../cards/types.js';

export interface MarketPriceFields {
  marketPrice: number | null;
  marketPriceCurrency: string | null;
  marketPriceSource: string | null;
  marketPriceUpdatedAt: Date | null;
}

export interface CardRecordSource {
  id: string;
  name: string;
  number: string;
  set: { id: string; name: string; series?: string | null; releaseDate?: string | null };
  rarity?: string | null;
  image?: Partial<CardImage> | null;
  category?: string | null;
  types?: string[] | null;
  hp?: number | null;
  stage?: string | null;
  illustrator?: string | null;
  dexId?: number[] | null;
  regulationMark?: string | null;
  trainerType?: string | null;
  energyType?: string | null;
  marketPrice?: MarketPrice | null;
}

export interface CardRecord extends MarketPriceFields {
  id: string;
  name: string;
  setId: string;
  setName: string;
  setSeries: string | null;
  releaseDate: Date | null;
  number: string;
  rarity: string | null;
  imageUrl: string | null;
  category: string | null;
  types: string[];
  hp: number | null;
  stage: string | null;
  illustrator: string | null;
  dexId: number[];
  regulationMark: string | null;
  trainerType: string | null;
  energyType: string | null;
}

export interface UserCardInfo {
  inCollection: number;
  inWishlist: boolean;
  onTradeList: boolean;
}

export interface UserCardFacts {
  quantity: number | null | undefined;
  wishlistItem: unknown;
  activeListing: unknown;
}

export function toMarketPriceFields(marketPrice: MarketPrice | null | undefined, now = new Date()): MarketPriceFields {
  if (!marketPrice) {
    return {
      marketPrice: null,
      marketPriceCurrency: null,
      marketPriceSource: null,
      marketPriceUpdatedAt: null,
    };
  }

  return {
    marketPrice: marketPrice.value,
    marketPriceCurrency: marketPrice.currency,
    marketPriceSource: marketPrice.source,
    marketPriceUpdatedAt: marketPrice.updatedAt ? new Date(marketPrice.updatedAt) : now,
  };
}

export function toCardResponse<T extends { marketPrice: unknown }>(
  card: T,
): Omit<T, 'marketPrice'> & { marketPrice: number | null } {
  return {
    ...card,
    marketPrice: card.marketPrice == null ? null : Number(card.marketPrice),
  };
}

export function toCardRecord(card: CardRecordSource, now = new Date()): CardRecord {
  return {
    id: card.id,
    name: card.name,
    setId: card.set.id,
    setName: card.set.name,
    setSeries: card.set.series ?? null,
    releaseDate: card.set.releaseDate ? new Date(card.set.releaseDate) : null,
    number: card.number,
    rarity: card.rarity ?? null,
    imageUrl: card.image?.small ?? null,
    category: card.category ?? null,
    types: card.types ?? [],
    hp: card.hp ?? null,
    stage: card.stage ?? null,
    illustrator: card.illustrator ?? null,
    dexId: card.dexId ?? [],
    regulationMark: card.regulationMark ?? null,
    trainerType: card.trainerType ?? null,
    energyType: card.energyType ?? null,
    ...toMarketPriceFields(card.marketPrice, now),
  };
}

export function toUserCardInfo({ quantity, wishlistItem, activeListing }: UserCardFacts): UserCardInfo {
  return {
    inCollection: quantity ?? 0,
    inWishlist: Boolean(wishlistItem),
    onTradeList: Boolean(activeListing),
  };
}
