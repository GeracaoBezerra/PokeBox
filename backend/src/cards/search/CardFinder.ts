import type { CardListQuery, CardListResult } from '../types.js';

export interface CardFinder {
  find(query: CardListQuery): Promise<CardListResult>;
}
