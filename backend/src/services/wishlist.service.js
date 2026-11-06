import * as collectionRepository from '../repositories/collectionRepository.js';
import { upsertCard } from '../repositories/cardRepository.js';
import * as wishlistRepository from '../repositories/wishlistRepository.js';
import { AppError } from '../utils/AppError.js';
import { toCardRecord } from '../utils/cardRecord.js';
import { assertOwner } from '../utils/collectionRules.js';
import { countOwnersByCard, toWishlistItemResponse } from '../utils/wishlistRules.js';
import { fetchCard } from './card.service.js';

async function ownersByCard(cardIds, userId) {
  if (cardIds.length === 0) return new Map();

  const owners = await collectionRepository.findOwnersOfCards(cardIds, userId);
  return countOwnersByCard(owners);
}

export async function list(userId) {
  const items = await wishlistRepository.findManyByUser(userId);
  const owners = await ownersByCard(items.map((item) => item.cardId), userId);

  return items.map((item) => toWishlistItemResponse(item, owners));
}

export async function add(userId, input) {
  const card = await fetchCard(input.cardId);
  await upsertCard(toCardRecord(card));

  try {
    const item = await wishlistRepository.create({ userId, cardId: card.id });
    const owners = await ownersByCard([card.id], userId);
    return toWishlistItemResponse(item, owners);
  } catch (err) {
    if (err?.code === 'P2002') throw new AppError(409, 'Esta carta já está na sua wishlist');
    throw err;
  }
}

export async function remove(userId, id) {
  const item = await wishlistRepository.findById(id);
  if (!item) throw new AppError(404, 'Item da wishlist não encontrado');

  assertOwner(item, userId);
  await wishlistRepository.remove(id);
}
