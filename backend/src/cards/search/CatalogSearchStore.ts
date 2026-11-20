import type { CardFilterValues, CardSort } from '../types.js';

export interface CatalogSet {
  id: string;
  name: string;
}

export interface CatalogEntry {
  id: string;
  localId: string;
  name: string;
  setId: string;
  setName: string;
  imageUrl: string | null;
  wishlistCount?: number | null;
  tradeCount?: number | null;
}

export interface CatalogAttributeFilters {
  type?: string;
  rarity?: string;
  category?: string;
}

export interface CatalogSearch {
  lang: string;
  words: string[];
  phrase: string;
  setIds: string[];
  onlySetId?: string;
  attributes?: CatalogAttributeFilters;
  offset: number;
  take: number;
  sort?: CardSort;
}

export interface CatalogSearchStore {
  listSets(lang: string): Promise<CatalogSet[]>;
  filterValues(lang: string): Promise<CardFilterValues | null>;
  matchingWords(lang: string, words: string[]): Promise<string[]>;
  search(query: CatalogSearch): Promise<CatalogEntry[]>;
}
