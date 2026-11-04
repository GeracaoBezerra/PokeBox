import * as collectionRepository from '../repositories/collectionRepository.js';
import { findCardById } from '../repositories/cardRepository.js';
import { CardNotFoundError } from '../repositories/tcgdexRepository.js';
import { AppError } from '../utils/AppError.js';
import { toCardRecord } from '../utils/cardRecord.js';
import {
  assertOwner,
  assertQuantity,
  assertVariant,
  toCollectionItemResponse,
} from '../utils/collectionRules.js';

async function fetchCard(cardId) {
  try {
    return await findCardById(cardId, 'en');
  } catch (err) {
    if (err instanceof CardNotFoundError) throw new AppError(404, 'Carta não encontrada');
    throw err;
  }
}

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

  await collectionRepository.upsertCard(toCardRecord(card));
  const item = await collectionRepository.addOrIncrement({ ...input, cardId: card.id, userId });

  return toCollectionItemResponse(item);
}

export async function update(userId, id, input) {
  const item = await findOwnItem(userId, id);

  if (input.quantity !== undefined) {
    assertQuantity(input.quantity, item.reservedQuantity);
  }

  const updated = await collectionRepository.update(id, input);
  return toCollectionItemResponse(updated);
}

export async function remove(userId, id) {
  await findOwnItem(userId, id);
  await collectionRepository.remove(id);
}
