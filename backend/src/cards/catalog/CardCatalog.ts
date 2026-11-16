import type { CardDetail, CardFilters, CardFilterValues, CardSort, CardSummary, SetSummary } from '../types.js';

export interface CardSearchQuery {
  lang: string;
  name?: string;
  page: number;
  limit: number;
  filters?: CardFilters;
  sort?: CardSort;
}

export interface CardCatalog {
  getById(id: string, lang: string): Promise<CardDetail>;
  search(query: CardSearchQuery): Promise<CardSummary[]>;
  listSets(lang: string): Promise<SetSummary[]>;
  listSetCards(setId: string, lang: string): Promise<CardSummary[]>;
  listFilterValues(lang: string): Promise<CardFilterValues>;
}
