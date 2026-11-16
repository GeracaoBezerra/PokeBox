import { MemoryCache } from '../../utils/memoryCache.js';
import { matchSets, nameMatchesAny, rankCards, toCardListItem, tokenize } from '../../utils/cardSearch.js';
import type { CardCatalog, CardSearchQuery } from '../catalog/CardCatalog.js';
import type {
  CardFilters,
  CardListItem,
  CardListQuery,
  CardListResult,
  CardSearchInfo,
  CardSort,
  CardSummary,
} from '../types.js';
import type { CardFinder } from './CardFinder.js';

const SEARCH_PAGE_SIZE = 250;
const MAX_WORD_SEARCHES = 4;
const FILTER_KEYS: (keyof CardFilters)[] = ['type', 'rarity', 'set', 'category'];

function hasFilters(filters: CardFilters): boolean {
  return FILTER_KEYS.some((key) => Boolean(filters[key]));
}

function filterKey(filters: CardFilters, sort?: CardSort): string {
  const values = FILTER_KEYS.map((key) => `${key}=${filters[key] ?? ''}`);
  return [...values, `sort=${sort ? `${sort.field}:${sort.order}` : ''}`].join('&');
}

function sortCards(cards: CardListItem[], sort?: CardSort): CardListItem[] {
  if (!sort) return cards;
  const direction = sort.order === 'desc' ? -1 : 1;
  return [...cards].sort((a, b) => direction * a.name.localeCompare(b.name));
}

interface RankedSearch {
  cards: CardListItem[];
  search: CardSearchInfo;
}

interface NameSearch {
  cards: CardSummary[];
  found: string[];
}

export interface SmartCardFinderOptions {
  ttlMs: number;
}

export class SmartCardFinder implements CardFinder {
  private readonly searches: MemoryCache<RankedSearch>;
  private readonly lists: MemoryCache<CardListResult>;

  constructor(
    private readonly catalog: CardCatalog,
    { ttlMs }: SmartCardFinderOptions,
  ) {
    this.searches = new MemoryCache(ttlMs);
    this.lists = new MemoryCache(ttlMs);
  }

  async find({ lang, name, page, limit, filters = {}, sort }: CardListQuery): Promise<CardListResult> {
    const tokens = tokenize(name);
    const filtersKey = filterKey(filters, sort);
    if (tokens.length === 0) return this.listAll({ lang, page, limit, filters, sort }, filtersKey);

    const key = `search:${lang}:${filtersKey}:${tokens.join(' ')}`;
    let result = this.searches.get(key);
    if (!result) {
      const found = await this.searchCards(lang, tokens, filters);
      result = { ...found, cards: sortCards(found.cards, sort) };
      this.searches.set(key, result);
    }

    const start = (page - 1) * limit;
    const end = start + limit;
    return {
      cards: result.cards.slice(start, end),
      hasNextPage: end < result.cards.length,
      search: result.search,
    };
  }

  private async listAll(query: CardSearchQuery, filtersKey: string): Promise<CardListResult> {
    const { lang, page, limit } = query;
    const key = `list:${lang}:${filtersKey}:${page}:${limit}`;
    const fromMemory = this.lists.get(key);
    if (fromMemory) return fromMemory;

    const [found, sets] = await Promise.all([this.catalog.search(query), this.catalog.listSets(lang)]);
    const result: CardListResult = {
      cards: found.map((card) => toCardListItem(card, sets)),
      hasNextPage: found.length === limit,
      search: null,
    };
    this.lists.set(key, result);
    return result;
  }

  private searchByName(lang: string, words: string, filters: CardFilters): Promise<CardSummary[]> {
    return this.catalog.search({ lang, name: words, page: 1, limit: SEARCH_PAGE_SIZE, filters });
  }

  private cardsOfSet(setId: string, lang: string, filters: CardFilters): Promise<CardSummary[]> {
    if (!hasFilters(filters)) return this.catalog.listSetCards(setId, lang);
    return this.catalog.search({ lang, page: 1, limit: SEARCH_PAGE_SIZE, filters: { ...filters, set: setId } });
  }

  private async searchNameTokens(lang: string, nameTokens: string[], filters: CardFilters): Promise<NameSearch> {
    if (nameTokens.length === 0) return { cards: [], found: [] };

    const cards = await this.searchByName(lang, nameTokens.join(' '), filters);
    if (cards.length > 0) return { cards, found: nameTokens };
    if (nameTokens.length === 1) return { cards, found: [] };

    return this.searchEachWord(lang, nameTokens, filters);
  }

  private async searchEachWord(lang: string, tokens: string[], filters: CardFilters): Promise<NameSearch> {
    const words = [...tokens].sort((a, b) => b.length - a.length).slice(0, MAX_WORD_SEARCHES);
    const results = await Promise.all(words.map((word) => this.searchByName(lang, word, filters)));
    return {
      cards: results.flat(),
      found: words.filter((_, index) => results[index].length > 0),
    };
  }

  private async searchCards(lang: string, tokens: string[], filters: CardFilters): Promise<RankedSearch> {
    const sets = await this.catalog.listSets(lang);
    const matched = matchSets(tokens, sets);
    const nameTokens = tokens.filter((token) => !matched.used.includes(token));
    const partialSetTokens = matched.used.filter((token) => !matched.complete.includes(token));
    const setIds = matched.sets.map((set) => set.id).filter((setId) => !filters.set || setId === filters.set);

    const [firstTry, bySet] = await Promise.all([
      this.searchNameTokens(lang, nameTokens, filters),
      Promise.all(setIds.map((setId) => this.cardsOfSet(setId, lang, filters))),
    ]);

    const byName = firstTry.cards.length === 0 && partialSetTokens.length > 0
      ? await this.searchEachWord(lang, partialSetTokens, filters)
      : firstTry;

    const searchWords = byName.found;
    const setCards = bySet
      .flat()
      .filter((card) => searchWords.length === 0 || nameMatchesAny(card.name, searchWords));

    const ranked = rankCards([...setCards, ...byName.cards], {
      nameTokens: searchWords,
      setIds,
      phrase: tokens.join(' '),
    });

    return {
      cards: ranked.map((card) => toCardListItem(card, sets)),
      search: {
        name: searchWords.length > 0 ? searchWords.join(' ') : null,
        sets: matched.sets.map((set) => set.name),
        ignored: nameTokens.filter((token) => !searchWords.includes(token)),
      },
    };
  }
}
