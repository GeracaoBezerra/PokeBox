import type { CardDetail } from '../cards/types.js';
import type { CardFetcher } from './CardService.js';

let registered: CardFetcher | null = null;

export function registerLegacyCardFetcher(fetcher: CardFetcher): void {
  registered = fetcher;
}

export function fetchCard(cardId: string): Promise<CardDetail> {
  if (!registered) return Promise.reject(new Error('CardService ainda não foi montado no container'));
  return registered.fetchCard(cardId);
}
