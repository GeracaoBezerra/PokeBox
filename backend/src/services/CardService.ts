import type { CardCatalog } from '../cards/catalog/CardCatalog.js';
import type { CardFinder } from '../cards/search/CardFinder.js';
import type { CardDetail, CardListQuery, CardListResult } from '../cards/types.js';
import { AppError } from '../errors/AppError.js';
import { CardNotFoundError } from '../errors/CardNotFoundError.js';
import { toUserCardInfo, type UserCardInfo } from '../utils/cardRecord.js';

export interface CollectionQuantityReader {
  sumQuantityByUserAndCard(userId: string, cardId: string): Promise<number | null>;
}

export interface WishlistPresenceReader {
  existsByUserAndCard(userId: string, cardId: string): Promise<{ id: string } | null>;
}

export interface ActiveListingReader {
  existsActiveByUserAndCard(userId: string, cardId: string): Promise<{ id: string } | null>;
}

export interface UserCardReaders {
  collection: CollectionQuantityReader;
  wishlist: WishlistPresenceReader;
  listings: ActiveListingReader;
}

export interface CardFetcher {
  fetchCard(cardId: string): Promise<CardDetail>;
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

  find(query: CardListQuery): Promise<CardListResult> {
    return this.finder.find(query);
  }

  async fetchCard(cardId: string): Promise<CardDetail> {
    try {
      return await this.catalog.getById(cardId, 'en');
    } catch (err) {
      if (err instanceof CardNotFoundError) throw new AppError(404, 'Carta não encontrada');
      throw err;
    }
  }

  async getUserCardInfo(userId: string, cardId: string): Promise<UserCardInfo> {
    const [quantity, wishlistItem, activeListing] = await Promise.all([
      this.readers.collection.sumQuantityByUserAndCard(userId, cardId),
      this.readers.wishlist.existsByUserAndCard(userId, cardId),
      this.readers.listings.existsActiveByUserAndCard(userId, cardId),
    ]);
    return toUserCardInfo({ quantity, wishlistItem, activeListing });
  }
}
