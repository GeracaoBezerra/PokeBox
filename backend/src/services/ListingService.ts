import { NotFoundError } from '../errors/domainErrors.js';
import type { Db } from '../lib/prisma.js';
import type { CollectionLocker, LockedCollectionItem } from '../repositories/CollectionRepository.js';
import type { ListingRepository, ListingWithItem } from '../repositories/ListingRepository.js';
import type { TransactionRunner } from '../repositories/TransactionRunner.js';
import type { CreateListingInput, ListListingsQuery, UpdateListingInput } from '../schemas/listing.schema.js';
import { assertOwner } from '../utils/collectionRules.js';
import {
  assertListingQuantity,
  assertListingUpdate,
  isListingVisible,
  needsStockCheck,
  toListingResponse,
  type ListingResponse,
  type ListingViewer,
} from '../utils/listingRules.js';
import type { ListingChangeApplier } from './ListingChangeApplier.js';

export type ListingStore = Pick<
  ListingRepository,
  'findActive' | 'findByOwner' | 'findById' | 'sumOpenByItem' | 'create'
>;

export type ListingChanger = Pick<ListingChangeApplier, 'apply'>;

export interface ListingServiceDeps {
  listings: ListingStore;
  collection: Pick<CollectionLocker, 'lockById'>;
  transactions: TransactionRunner;
  changes: ListingChanger;
}

export type ListingView = ListingResponse<ListingWithItem['collectionItem']['card']>;

export interface ListingPage {
  items: ListingView[];
  hasNextPage: boolean;
}

const LISTINGS_PER_CARD = 50;
const LISTING_NOT_FOUND = 'Anúncio não encontrado';
const ITEM_NOT_FOUND = 'Item da coleção não encontrado';

export class ListingService {
  constructor(private readonly deps: ListingServiceDeps) {}

  async list({ page, limit, ...filters }: ListListingsQuery): Promise<ListingPage> {
    const listings = await this.deps.listings.findActive({
      ...filters,
      skip: (page - 1) * limit,
      take: limit + 1,
    });

    return {
      items: listings.slice(0, limit).map((listing) => toListingResponse(listing)),
      hasNextPage: listings.length > limit,
    };
  }

  async listByCard(cardId: string): Promise<ListingView[]> {
    const listings = await this.deps.listings.findActive({ cardId, take: LISTINGS_PER_CARD });
    return listings.map((listing) => toListingResponse(listing));
  }

  async listMine(userId: string): Promise<ListingView[]> {
    const listings = await this.deps.listings.findByOwner(userId);
    return listings.map((listing) => toListingResponse(listing));
  }

  async getById(viewer: ListingViewer | undefined, id: string): Promise<ListingView> {
    const listing = await this.deps.listings.findById(id);
    if (!listing || !isListingVisible(listing, viewer)) throw new NotFoundError(LISTING_NOT_FOUND);

    return toListingResponse(listing);
  }

  async create(userId: string, input: CreateListingInput): Promise<ListingView> {
    const { collection, listings, transactions } = this.deps;

    const listing = await transactions.run(async (tx) => {
      const item = await collection.lockById(input.collectionItemId, tx);
      if (!item) throw new NotFoundError(ITEM_NOT_FOUND);

      assertOwner(item, userId);
      await this.assertStock(tx, item, input.quantity);

      return listings.create(input, tx);
    });

    return toListingResponse(listing);
  }

  async update(user: ListingViewer, id: string, input: UpdateListingInput): Promise<ListingView> {
    const { collection, listings, transactions, changes } = this.deps;

    const found = await listings.findById(id);
    if (!found) throw new NotFoundError(LISTING_NOT_FOUND);

    const listing = await transactions.run(async (tx) => {
      const item = await collection.lockById(found.collectionItemId, tx);
      const current = await listings.findById(id, tx);
      if (!item || !current) throw new NotFoundError(LISTING_NOT_FOUND);

      assertListingUpdate({
        from: current.status,
        input,
        isOwner: item.userId === user.id,
        isAdmin: user.role === 'ADMIN',
      });

      const next = {
        quantity: input.quantity ?? current.quantity,
        status: input.status ?? current.status,
      };

      if (needsStockCheck(current, next)) {
        await this.assertStock(tx, item, next.quantity, id);
      }

      return changes.apply(current, input, tx);
    });

    return toListingResponse(listing);
  }

  private async assertStock(tx: Db, item: LockedCollectionItem, requested: number, exceptId?: string): Promise<void> {
    const otherListed = await this.deps.listings.sumOpenByItem(item.id, tx, exceptId);
    assertListingQuantity({ requested, otherListed, available: item.quantity - item.reservedQuantity });
  }
}
