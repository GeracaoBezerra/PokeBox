import { MemoryCache } from '../../utils/memoryCache.js';
import type { CardDetail, CardSummary, SetSummary } from '../types.js';
import type { CardCatalog, CardSearchQuery } from './CardCatalog.js';

export interface MemoryCachedCatalogOptions {
  detailTtlMs: number;
  isCacheable?: (card: CardDetail) => boolean;
}

export class MemoryCachedCatalog implements CardCatalog {
  private readonly details: MemoryCache<CardDetail>;
  private readonly isCacheable: (card: CardDetail) => boolean;

  constructor(
    private readonly inner: CardCatalog,
    { detailTtlMs, isCacheable = () => true }: MemoryCachedCatalogOptions,
  ) {
    this.details = new MemoryCache(detailTtlMs);
    this.isCacheable = isCacheable;
  }

  async getById(id: string, lang: string): Promise<CardDetail> {
    const key = `${lang}:${id}`;
    const fromMemory = this.details.get(key);
    if (fromMemory) return fromMemory;

    const card = await this.inner.getById(id, lang);
    if (!this.isCacheable(card)) return card;
    this.details.set(`${lang}:${card.id}`, card);
    if (card.id !== id) this.details.set(key, card);
    return card;
  }

  search(query: CardSearchQuery): Promise<CardSummary[]> {
    return this.inner.search(query);
  }

  listSets(lang: string): Promise<SetSummary[]> {
    return this.inner.listSets(lang);
  }

  listSetCards(setId: string, lang: string): Promise<CardSummary[]> {
    return this.inner.listSetCards(setId, lang);
  }
}
