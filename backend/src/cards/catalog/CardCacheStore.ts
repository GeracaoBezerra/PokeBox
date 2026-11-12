import type { CardDetail } from '../types.js';

export interface CachedCard {
  data: CardDetail;
  updatedAt: Date;
}

export interface CardCacheStore {
  read(cardId: string, lang: string): Promise<CachedCard | null>;
  write(cardId: string, lang: string, data: CardDetail): Promise<void>;
}
