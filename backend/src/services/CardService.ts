import type { CardCatalog } from '../cards/catalog/CardCatalog.js';
import type { CardFinder } from '../cards/search/CardFinder.js';
import type {
  CardDetail,
  CardFilterOptions,
  CardFilters,
  CardFilterValues,
  CardListQuery,
  CardListResult,
} from '../cards/types.js';
import { AppError } from '../errors/AppError.js';
import { CardNotFoundError } from '../errors/CardNotFoundError.js';
import type { Lang } from '../middlewares/validateCardParams.js';
import type { CollectionQuantityReader } from '../repositories/CollectionRepository.js';
import type { ListingLookup } from '../repositories/ListingRepository.js';
import type { WishlistLookup } from '../repositories/WishlistRepository.js';
import { isValidCardId } from '../utils/cardId.js';
import { toUserCardInfo, type UserCardInfo } from '../utils/cardRecord.js';


export interface UserCardReaders {
  collection: CollectionQuantityReader;
  wishlist: WishlistLookup;
  listings: ListingLookup;
}

export interface CardFetcher {
  fetchCard(cardId: string, lang?: Lang): Promise<CardDetail>;
}

const CHECKED_FILTERS: [keyof CardFilters, keyof CardFilterValues][] = [
  ['type', 'types'],
  ['rarity', 'rarities'],
  ['category', 'categories'],
];

function toNotFound(err: unknown): unknown {
  return err instanceof CardNotFoundError ? new AppError(404, 'Carta não encontrada') : err;
}

export class CardService implements CardFetcher {
  constructor(
    private readonly catalog: CardCatalog,
    private readonly finder: CardFinder,
    private readonly readers: UserCardReaders,
  ) {}

  getById(id: string, lang: string): Promise<CardDetail> {
    return this.catalog.getById(id, lang);
  }

  async find(query: CardListQuery): Promise<CardListResult> {
    const filters = await this.resolveFilters(query.lang, query.filters);
    const result = await this.finder.find({ ...query, filters });
    return { ...result, cards: result.cards.filter((card) => isValidCardId(card.id)) };
  }

  async getFilterOptions(lang: string): Promise<CardFilterOptions> {
    const [values, sets] = await Promise.all([this.catalog.listFilterValues(lang), this.catalog.listSets(lang)]);
    return { ...values, sets: sets.map(({ id, name }) => ({ id, name })) };
  }

  private async resolveFilters(lang: string, filters: CardFilters = {}): Promise<CardFilters> {
    const asked = CHECKED_FILTERS.filter(([filter]) => filters[filter]);
    if (asked.length === 0) return filters;

    const values = await this.catalog.listFilterValues(lang);
    const resolved = { ...filters };
    const details: { field: string; message: string }[] = [];
    for (const [filter, list] of asked) {
      const wanted = filters[filter]!.toLowerCase();
      const match = values[list].find((value) => value.toLowerCase() === wanted);
      if (match) resolved[filter] = match;
      else details.push({ field: filter, message: `${filters[filter]} não existe em ${lang}; veja GET /cards/filters` });
    }

    if (details.length > 0) throw new AppError(400, 'Dados inválidos', details);
    return resolved;
  }

  async fetchCard(cardId: string, lang: Lang = 'en'): Promise<CardDetail> {
    try {
      return await this.catalog.getById(cardId, 'en');
    } catch (err) {
      if (!(err instanceof CardNotFoundError) || lang === 'en') throw toNotFound(err);
    }
    try {
      return await this.catalog.getById(cardId, lang);
    } catch (err) {
      throw toNotFound(err);
    }
  }

  async getUserCardInfo(userId: string, cardId: string): Promise<UserCardInfo> {
    const [quantity, wishlistItem, openListings] = await Promise.all([
      this.readers.collection.sumQuantityByUserAndCard(userId, cardId),
      this.readers.wishlist.existsByUserAndCard(userId, cardId),
      this.readers.listings.findOpenByUserAndCard(userId, cardId),
    ]);
    return toUserCardInfo({ quantity, wishlistItem, openListings });
  }
}
