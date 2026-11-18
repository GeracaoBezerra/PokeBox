import type { CatalogSearchStore } from '../search/CatalogSearchStore.js';
import type { CardDetail, CardFilterValues, CardSummary, SetSummary } from '../types.js';
import type { CardCatalog, CardSearchQuery } from './CardCatalog.js';

export type LocalCatalogReader = Pick<CatalogSearchStore, 'listSets' | 'filterValues'>;

export class LocalFirstCatalog implements CardCatalog {
  constructor(
    private readonly inner: CardCatalog,
    private readonly store: LocalCatalogReader,
  ) {}

  getById(id: string, lang: string): Promise<CardDetail> {
    return this.inner.getById(id, lang);
  }

  search(query: CardSearchQuery): Promise<CardSummary[]> {
    return this.inner.search(query);
  }

  async listSets(lang: string): Promise<SetSummary[]> {
    const sets = await this.store.listSets(lang);
    if (sets.length === 0) return this.inner.listSets(lang);
    return sets.map(({ id, name }) => ({ id, name, logo: null, symbol: null, cardCount: null }));
  }

  listSetCards(setId: string, lang: string): Promise<CardSummary[]> {
    return this.inner.listSetCards(setId, lang);
  }

  async listFilterValues(lang: string): Promise<CardFilterValues> {
    return (await this.store.filterValues(lang)) ?? this.inner.listFilterValues(lang);
  }
}
