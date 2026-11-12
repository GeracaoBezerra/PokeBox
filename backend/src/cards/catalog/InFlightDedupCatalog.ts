import type { CardDetail, CardSummary, SetSummary } from '../types.js';
import type { CardCatalog, CardSearchQuery } from './CardCatalog.js';

export class InFlightDedupCatalog implements CardCatalog {
  private readonly inFlight = new Map<string, Promise<CardDetail>>();

  constructor(private readonly inner: CardCatalog) {}

  async getById(id: string, lang: string): Promise<CardDetail> {
    const key = `${lang}:${id}`;
    const pending = this.inFlight.get(key);
    if (pending) return pending;

    const promise = this.inner.getById(id, lang);
    this.inFlight.set(key, promise);
    try {
      return await promise;
    } finally {
      this.inFlight.delete(key);
    }
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
