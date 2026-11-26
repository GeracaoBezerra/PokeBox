import { NotFoundError } from '../errors/domainErrors.js';
import type { Db } from '../lib/prisma.js';
import type {
  CollectionFilters,
  CollectionItemWithCard,
  CollectionItemWithUsage,
  CollectionRepository,
  CollectionSummary,
} from '../repositories/CollectionRepository.js';
import type { TransactionRunner } from '../repositories/TransactionRunner.js';
import type { WishlistRemover } from '../repositories/WishlistRepository.js';
import type { CreateCollectionItemInput, UpdateCollectionItemInput } from '../schemas/collection.schema.js';
import { toCardRecord } from '../utils/cardRecord.js';
import { cardFilterOptions } from '../utils/listFilterOptions.js';
import { toPage, toSkipTake, type Page, type PageParams } from '../utils/pagination.js';
import {
  assertConditionChangeable,
  assertCoversListings,
  assertNoListings,
  assertNoOffers,
  assertNotReserved,
  assertOwner,
  assertQuantity,
  assertVariant,
  toCollectionItemResponse,
  toOwnCollectionItem,
  type CollectionItemResponse,
  type OwnCollectionItem,
  type ListingCounts,
  type OfferCounts,
} from '../utils/collectionRules.js';
import type { CardFetcher } from './CardService.js';
import type { CardWriter } from './WishlistService.js';

export interface ItemListingCounter {
  sumOpenByItem(collectionItemId: string, db?: Db): Promise<number>;
  countByItem(collectionItemId: string, db?: Db): Promise<ListingCounts>;
}

export interface ItemOfferCounter {
  countByItem(collectionItemId: string, db?: Db): Promise<OfferCounts>;
}

export type CollectionStore = Pick<
  CollectionRepository,
  'findManyByUser' | 'findFilterRows' | 'summarizeByUser' | 'findById' | 'addOrIncrement' | 'lockById' | 'update' | 'remove'
>;

export interface CollectionServiceDeps {
  collection: CollectionStore;
  wishlist: WishlistRemover;
  listings: ItemListingCounter;
  offers: ItemOfferCounter;
  cards: CardFetcher;
  cardStore: CardWriter;
  transactions: TransactionRunner;
}

export type CollectionItemView = CollectionItemResponse<CollectionItemWithCard>;

export type OwnCollectionItemView = OwnCollectionItem<CollectionItemWithUsage>;
type CollectionFilterOptions = Pick<ReturnType<typeof cardFilterOptions>, 'types' | 'sets'> & {
  conditions: string[];
  finishes: string[];
};

export interface AddedCollectionItem {
  item: CollectionItemView;
  removedFromWishlist: boolean;
}

const ITEM_NOT_FOUND = 'Item da coleção não encontrado';

export class CollectionService {
  constructor(private readonly deps: CollectionServiceDeps) {}

  async list(userId: string): Promise<OwnCollectionItemView[]> {
    const items = await this.deps.collection.findManyByUser(userId);
    return items.map((item) => toOwnCollectionItem(item));
  }

  async listPage(
    userId: string,
    filters: CollectionFilters,
    page: PageParams,
    includeFilters = true,
  ): Promise<Page<OwnCollectionItemView> & { filters?: CollectionFilterOptions }> {
    const [rows, options] = await Promise.all([
      this.deps.collection.findManyByUser(userId, { ...filters, ...toSkipTake(page) }),
      includeFilters ? this.filterOptions(userId, filters.withZero) : undefined,
    ]);
    const { items, hasNextPage } = toPage(rows, page);
    return { items: items.map((item) => toOwnCollectionItem(item)), hasNextPage, ...(options && { filters: options }) };
  }

  async filterOptions(userId: string, withZero?: boolean): Promise<CollectionFilterOptions> {
    const filterRows = await this.deps.collection.findFilterRows(userId, withZero);
    const { types, sets } = cardFilterOptions(filterRows.map(({ card }) => card));
    return {
      types,
      sets,
      conditions: [...new Set(filterRows.map(({ condition }) => condition))].sort(),
      finishes: [...new Set(filterRows.map(({ finish }) => finish))].sort(),
    };
  }

  summary(userId: string): Promise<CollectionSummary> {
    return this.deps.collection.summarizeByUser(userId);
  }

  async add(userId: string, input: CreateCollectionItemInput): Promise<AddedCollectionItem> {
    const { collection, wishlist, cards, cardStore, transactions } = this.deps;

    const { lang, ...itemData } = input;
    const card = await cards.fetchCard(input.cardId, lang);
    assertVariant(card.variants, input.finish, input.firstEdition);

    await cardStore.upsertCard(toCardRecord(card));

    const { item, removedFromWishlist } = await transactions.run(async (tx) => {
      const item = await collection.addOrIncrement({ ...itemData, cardId: card.id, userId }, tx);
      const removedFromWishlist = await wishlist.removeByUserAndCard(userId, card.id, tx);
      return { item, removedFromWishlist };
    });

    return { item: toCollectionItemResponse(item), removedFromWishlist };
  }

  async update(userId: string, id: string, input: UpdateCollectionItemInput): Promise<CollectionItemView> {
    const { collection, wishlist, listings, offers, transactions } = this.deps;

    const updated = await transactions.run(async (tx) => {
      const item = await collection.lockById(id, tx);
      if (!item) throw new NotFoundError(ITEM_NOT_FOUND);

      assertOwner(item, userId);

      if (input.quantity !== undefined) {
        assertQuantity(input.quantity, item.reservedQuantity);
        const listed = await listings.sumOpenByItem(id, tx);
        assertCoversListings(input.quantity, item.reservedQuantity, listed);
      }

      if (input.condition !== undefined && input.condition !== item.condition) {
        assertConditionChangeable({
          reservedQuantity: item.reservedQuantity,
          offers: await offers.countByItem(id, tx),
          listings: await listings.countByItem(id, tx),
        });
      }

      const saved = await collection.update(id, input, tx);

      if (item.quantity === 0 && input.quantity !== undefined && input.quantity > 0) {
        await wishlist.removeByUserAndCard(userId, item.cardId, tx);
      }

      return saved;
    });

    return toCollectionItemResponse(updated);
  }

  async remove(userId: string, id: string): Promise<void> {
    const { collection, listings, offers } = this.deps;

    const item = await collection.findById(id);
    if (!item) throw new NotFoundError(ITEM_NOT_FOUND);

    assertOwner(item, userId);
    assertNotReserved(item);
    assertNoListings(await listings.countByItem(id));
    assertNoOffers(await offers.countByItem(id));
    await collection.remove(id);
  }
}
