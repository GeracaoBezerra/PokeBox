import * as collectionRepository from '../repositories/collectionRepository.js';
import * as listingRepository from '../repositories/listingRepository.js';
import * as offerRepository from '../repositories/offerRepository.js';
import { withTransaction } from '../repositories/transaction.js';
import { AppError } from '../utils/AppError.js';
import { assertOwner } from '../utils/collectionRules.js';
import {
  assertListingQuantity,
  assertListingUpdate,
  isListingVisible,
  needsStockCheck,
  toListingResponse,
} from '../utils/listingRules.js';

const LISTINGS_PER_CARD = 50;
const CANCELS_OFFERS = ['CLOSED', 'BLOCKED'];

async function assertStock(tx, item, requested, exceptId) {
  const otherListed = await listingRepository.sumOpenByItem(item.id, tx, exceptId);
  assertListingQuantity({ requested, otherListed, available: item.quantity - item.reservedQuantity });
}

export async function list({ cardId, username, page, limit }) {
  const listings = await listingRepository.findActive({
    cardId,
    username,
    skip: (page - 1) * limit,
    take: limit + 1,
  });

  return {
    items: listings.slice(0, limit).map(toListingResponse),
    hasNextPage: listings.length > limit,
  };
}

export async function listByCard(cardId) {
  const listings = await listingRepository.findActive({ cardId, take: LISTINGS_PER_CARD });
  return listings.map(toListingResponse);
}

export async function listMine(userId) {
  const listings = await listingRepository.findByOwner(userId);
  return listings.map(toListingResponse);
}

export async function getById(viewer, id) {
  const listing = await listingRepository.findById(id);
  if (!listing || !isListingVisible(listing, viewer)) throw new AppError(404, 'Anúncio não encontrado');

  return toListingResponse(listing);
}

export async function create(userId, input) {
  const listing = await withTransaction(async (tx) => {
    const item = await collectionRepository.lockById(input.collectionItemId, tx);
    if (!item) throw new AppError(404, 'Item da coleção não encontrado');

    assertOwner(item, userId);
    await assertStock(tx, item, input.quantity);

    return listingRepository.create(input, tx);
  });

  return toListingResponse(listing);
}

export async function update(user, id, input) {
  const found = await listingRepository.findById(id);
  if (!found) throw new AppError(404, 'Anúncio não encontrado');

  const listing = await withTransaction(async (tx) => {
    const item = await collectionRepository.lockById(found.collectionItemId, tx);
    const current = await listingRepository.findById(id, tx);

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
      await assertStock(tx, item, next.quantity, id);
    }

    if (CANCELS_OFFERS.includes(next.status)) {
      await offerRepository.cancelOpenByListing(id, tx);
    }

    return listingRepository.update(id, input, tx);
  });

  return toListingResponse(listing);
}
