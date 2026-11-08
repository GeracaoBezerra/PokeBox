import * as collectionRepository from '../repositories/collectionRepository.js';
import { upsertCard } from '../repositories/cardRepository.js';
import * as listingRepository from '../repositories/listingRepository.js';
import * as offerRepository from '../repositories/offerRepository.js';
import { withTransaction } from '../repositories/transaction.js';
import { AppError } from '../utils/AppError.js';
import { toCardRecord } from '../utils/cardRecord.js';
import {
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
  const item = await collectionRepository.addOrIncrement({ ...input, cardId: card.id, userId });

  return toCollectionItemResponse(item);
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

    return collectionRepository.update(id, input, tx);
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
