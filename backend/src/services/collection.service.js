import * as collectionRepository from '../repositories/collectionRepository.js';
import { upsertCard } from '../repositories/cardRepository.js';
import * as listingRepository from '../repositories/listingRepository.js';
import * as offerRepository from '../repositories/offerRepository.js';
import * as wishlistRepository from '../repositories/wishlistRepository.js';
import { withTransaction } from '../repositories/transaction.js';
import { AppError } from '../errors/AppError.js';
import { toCardRecord } from '../utils/cardRecord.js';
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
} from '../utils/collectionRules.js';
import { fetchCard } from './card.service.js';

async function findOwnItem(userId, id) {
  const item = await collectionRepository.findById(id);
  if (!item) throw new AppError(404, 'Item da coleção não encontrado');

  assertOwner(item, userId);
  return item;
}

export async function list(userId) {
  const items = await collectionRepository.findManyByUser(userId);
  return items.map(toCollectionItemResponse);
}

export async function add(userId, input) {
  const card = await fetchCard(input.cardId);
  assertVariant(card.variants, input.finish, input.firstEdition);

  await upsertCard(toCardRecord(card));

  const { item, removedFromWishlist } = await withTransaction(async (tx) => {
    const item = await collectionRepository.addOrIncrement({ ...input, cardId: card.id, userId }, tx);
    const removedFromWishlist = await wishlistRepository.removeByUserAndCard(userId, card.id, tx);
    return { item, removedFromWishlist };
  });

  return { item: toCollectionItemResponse(item), removedFromWishlist };
}

export async function update(userId, id, input) {
  const updated = await withTransaction(async (tx) => {
    const item = await collectionRepository.lockById(id, tx);
    if (!item) throw new AppError(404, 'Item da coleção não encontrado');

    assertOwner(item, userId);

    if (input.quantity !== undefined) {
      assertQuantity(input.quantity, item.reservedQuantity);
      const listed = await listingRepository.sumOpenByItem(id, tx);
      assertCoversListings(input.quantity, item.reservedQuantity, listed);
    }

    if (input.condition !== undefined && input.condition !== item.condition) {
      assertConditionChangeable({
        reservedQuantity: item.reservedQuantity,
        offers: await offerRepository.countByItem(id, tx),
        listings: await listingRepository.countByItem(id, tx),
      });
    }

    const saved = await collectionRepository.update(id, input, tx);

    if (item.quantity === 0 && input.quantity > 0) {
      await wishlistRepository.removeByUserAndCard(userId, item.cardId, tx);
    }

    return saved;
  });

  return toCollectionItemResponse(updated);
}

export async function remove(userId, id) {
  const item = await findOwnItem(userId, id);
  assertNotReserved(item);
  assertNoListings(await listingRepository.countByItem(id));
  assertNoOffers(await offerRepository.countByItem(id));
  await collectionRepository.remove(id);
}
