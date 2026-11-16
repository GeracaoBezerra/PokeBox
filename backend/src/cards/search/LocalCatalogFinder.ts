import { matchSets, tokenize } from '../../utils/cardSearch.js';
import { MemoryCache } from '../../utils/memoryCache.js';
import type { CardListItem, CardListQuery, CardListResult } from '../types.js';
import type { CardFinder } from './CardFinder.js';
import type { CatalogEntry, CatalogSearchStore, CatalogSet } from './CatalogSearchStore.js';

export interface LocalCatalogFinderOptions {
  setsTtlMs: number;
}

function toCardListItem(entry: CatalogEntry): CardListItem {
  return {
    id: entry.id,
    localId: entry.localId,
    number: entry.localId,
    name: entry.name,
    set: { id: entry.setId, name: entry.setName },
    image: {
      small: entry.imageUrl,
      large: entry.imageUrl ? entry.imageUrl.replace(/\/low\.webp$/, '/high.webp') : null,
    },
  };
}

export class LocalCatalogFinder implements CardFinder {
  private readonly sets: MemoryCache<CatalogSet[]>;

  constructor(
    private readonly store: CatalogSearchStore,
    private readonly fallback: CardFinder,
    { setsTtlMs }: LocalCatalogFinderOptions,
  ) {
    this.sets = new MemoryCache(setsTtlMs);
  }

  async find(query: CardListQuery): Promise<CardListResult> {
    const { lang, name, page, limit, filters = {}, sort } = query;
    const tokens = tokenize(name);
    if (tokens.length === 0 || filters.type || filters.rarity || filters.category) return this.fallback.find(query);

    const sets = await this.listSets(lang);
    if (sets.length === 0) return this.fallback.find(query);

    const matched = matchSets(tokens, sets);
    const nameTokens = tokens.filter((token) => !matched.used.includes(token));
    const partialSetTokens = matched.used.filter((token) => !matched.complete.includes(token));
    const setIds = matched.sets.map((set) => set.id).filter((setId) => !filters.set || setId === filters.set);

    const byName = await this.store.matchingWords(lang, nameTokens);
    const words = byName.length === 0 && partialSetTokens.length > 0
      ? await this.store.matchingWords(lang, partialSetTokens)
      : byName;

    const search = {
      name: words.length > 0 ? words.join(' ') : null,
      sets: matched.sets.filter((set) => setIds.includes(set.id)).map((set) => set.name),
      ignored: nameTokens.filter((token) => !words.includes(token)),
    };
    if (words.length === 0 && setIds.length === 0) return { cards: [], hasNextPage: false, search };

    const found = await this.store.search({
      lang,
      words,
      phrase: tokens.join(' '),
      setIds,
      onlySetId: filters.set,
      offset: (page - 1) * limit,
      take: limit + 1,
      sort,
    });

    return {
      cards: found.slice(0, limit).map(toCardListItem),
      hasNextPage: found.length > limit,
      search,
    };
  }

  private async listSets(lang: string): Promise<CatalogSet[]> {
    const fromMemory = this.sets.get(lang);
    if (fromMemory) return fromMemory;

    const sets = await this.store.listSets(lang);
    if (sets.length > 0) this.sets.set(lang, sets);
    return sets;
  }
}
