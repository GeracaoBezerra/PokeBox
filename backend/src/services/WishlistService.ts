import type { CollectionOwnersReader, CollectionQuantityReader } from '../repositories/CollectionRepository.js';
import type { CardRepository } from '../repositories/PrismaCardRepository.js';
import type { WishlistItemWithCard, WishlistRepository } from '../repositories/WishlistRepository.js';
import { AppError } from '../errors/AppError.js';
import { ConflictError } from '../errors/domainErrors.js';
import type { AddWishlistItemInput } from '../schemas/wishlist.schema.js';
import { toCardRecord } from '../utils/cardRecord.js';
import { assertOwner } from '../utils/collectionRules.js';
import { countOwnersByCard, toWishlistItemResponse, type WishlistItemResponse } from '../utils/wishlistRules.js';
import type { CardFetcher } from './CardService.js';

export type WishlistCollectionReader = CollectionOwnersReader & CollectionQuantityReader;

export type WishlistStore = Pick<WishlistRepository, 'findManyByUser' | 'findById' | 'create' | 'remove'>;

export type CardWriter = Pick<CardRepository, 'upsertCard'>;

export type WishlistItemView = WishlistItemResponse<WishlistItemWithCard['card']>;

export class WishlistService {
  constructor(
    private readonly wishlist: WishlistStore,
    private readonly collection: WishlistCollectionReader,
    private readonly cards: CardFetcher,
    private readonly cardStore: CardWriter,
  ) {}

  async list(userId: string): Promise<WishlistItemView[]> {
    const items = await this.wishlist.findManyByUser(userId);
    const owners = await this.ownersByCard(
      items.map((item) => item.cardId),
      userId,
    );

    return items.map((item) => toWishlistItemResponse(item, owners));
  }

  async add(userId: string, input: AddWishlistItemInput): Promise<WishlistItemView> {
    const card = await this.cards.fetchCard(input.cardId);

    const owned = await this.collection.sumQuantityByUserAndCard(userId, card.id);
    if (owned !== null && owned > 0) throw new ConflictError('Você já tem esta carta na sua coleção');

    await this.cardStore.upsertCard(toCardRecord(card));

    const item = await this.wishlist.create({ userId, cardId: card.id });

    const owners = await this.ownersByCard([card.id], userId);
    return toWishlistItemResponse(item, owners);
  }

  async remove(userId: string, id: string): Promise<void> {
    const item = await this.wishlist.findById(id);
    if (!item) throw new AppError(404, 'Item da wishlist não encontrado');

    assertOwner(item, userId);
    await this.wishlist.remove(id);
  }

  private async ownersByCard(cardIds: string[], userId: string): Promise<Map<string, number>> {
    if (cardIds.length === 0) return new Map();

    const owners = await this.collection.findOwnersOfCards(cardIds, userId);
    return countOwnersByCard(owners);
  }
}
