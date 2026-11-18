import type { Logger } from '../../lib/logger.js';
import type { CardDetail, CardFilterValues, CardSummary, MarketPrice, SetSummary } from '../types.js';
import type { CardCacheStore, CachedCard } from './CardCacheStore.js';
import type { CardCatalog, CardSearchQuery } from './CardCatalog.js';

export interface CardPriceWriter {
  refreshPrice(cardId: string, marketPrice: MarketPrice | null): Promise<void>;
}

export interface DbCachedCatalogOptions {
  store: CardCacheStore;
  prices: CardPriceWriter;
  ttlMs: number;
  logger?: Logger;
  now?: () => number;
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export class DbCachedCatalog implements CardCatalog {
  private readonly store: CardCacheStore;
  private readonly prices: CardPriceWriter;
  private readonly ttlMs: number;
  private readonly logger: Logger;
  private readonly now: () => number;
  private readonly staleCards = new WeakSet<CardDetail>();
  private readonly refreshing = new Map<string, Promise<void>>();

  constructor(
    private readonly inner: CardCatalog,
    { store, prices, ttlMs, logger = console, now = Date.now }: DbCachedCatalogOptions,
  ) {
    this.store = store;
    this.prices = prices;
    this.ttlMs = ttlMs;
    this.logger = logger;
    this.now = now;
  }

  isStale(card: CardDetail): boolean {
    return this.staleCards.has(card);
  }

  async getById(id: string, lang: string): Promise<CardDetail> {
    const cached = await this.readCache(id, lang);
    if (!cached) {
      const card = await this.inner.getById(id, lang);
      await this.save(card, lang);
      return card;
    }

    if (this.now() - cached.updatedAt.getTime() >= this.ttlMs) {
      this.staleCards.add(cached.data);
      this.refreshInBackground(cached.data.id, lang);
    }
    return cached.data;
  }

  whenRefreshed(): Promise<void> {
    return Promise.all(this.refreshing.values()).then(() => undefined);
  }

  private refreshInBackground(cardId: string, lang: string): void {
    const key = `${lang}:${cardId}`;
    if (this.refreshing.has(key)) return;

    const refresh = this.inner
      .getById(cardId, lang)
      .then((card) => this.save(card, lang))
      .catch((err: unknown) => {
        this.logger.warn({ err: errorMessage(err), cardId, lang }, 'falha ao atualizar a carta guardada');
      })
      .finally(() => this.refreshing.delete(key));
    this.refreshing.set(key, refresh);
  }

  private async save(card: CardDetail, lang: string): Promise<void> {
    await this.writeCache(card.id, lang, card);
    await this.refreshPrice(card);
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

  listFilterValues(lang: string): Promise<CardFilterValues> {
    return this.inner.listFilterValues(lang);
  }

  private async readCache(cardId: string, lang: string): Promise<CachedCard | null> {
    try {
      return await this.store.read(cardId, lang);
    } catch (err) {
      this.logger.warn({ err: errorMessage(err), cardId, lang }, 'falha ao ler o CardCache');
      return null;
    }
  }

  private async writeCache(cardId: string, lang: string, card: CardDetail): Promise<void> {
    try {
      await this.store.write(cardId, lang, card);
    } catch (err) {
      this.logger.warn({ err: errorMessage(err), cardId, lang }, 'falha ao salvar o CardCache');
    }
  }

  private async refreshPrice(card: CardDetail): Promise<void> {
    try {
      await this.prices.refreshPrice(card.id, card.marketPrice);
    } catch (err) {
      this.logger.warn({ err: errorMessage(err), cardId: card.id }, 'falha ao atualizar o preço da carta');
    }
  }
}
