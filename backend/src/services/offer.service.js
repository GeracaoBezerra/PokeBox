import * as listingRepository from '../repositories/listingRepository.js';
import * as offerRepository from '../repositories/offerRepository.js';
import { lockInOrder, withTransaction } from '../repositories/transaction.js';
import { AppError } from '../utils/AppError.js';
import { isListingVisible } from '../utils/listingRules.js';
import {
  assertCanPropose,
  assertListingActive,
  assertOfferItem,
  assertStatusChange,
  assertStillFulfillable,
  toOfferResponse,
} from '../utils/offerRules.js';

const RELEASES_ITEMS = ['REJECTED', 'CANCELED'];

function isParticipant(offer, userId) {
  return offer.proposerId === userId || offer.listing.collectionItem.userId === userId;
}

function assertCanReceiveOffers(listing, user) {
  if (!listing || !isListingVisible(listing, user) || listing.status !== 'ACTIVE') {
    throw new AppError(404, 'Anúncio não encontrado');
  }
}

export async function create(user, listingId, input) {
  const found = await listingRepository.findById(listingId);
  assertCanReceiveOffers(found, user);

  const offer = await withTransaction(async (tx) => {
    const offeredIds = input.items.map((item) => item.collectionItemId);
    const locked = await lockInOrder([found.collectionItemId, ...offeredIds], tx);

    const listing = await listingRepository.findById(listingId, tx);
    assertCanReceiveOffers(listing, user);
    assertCanPropose({ listing, proposerId: user.id, quantity: input.quantity });

    if (await offerRepository.findOpenByProposerAndListing(user.id, listingId, tx)) {
      throw new AppError(409, 'Você já tem uma oferta aberta neste anúncio. Cancele a anterior para fazer outra');
    }

    for (const { collectionItemId, quantity } of input.items) {
      const item = locked.get(collectionItemId);
      if (!item) throw new AppError(404, 'Item da coleção não encontrado');
      assertOfferItem({ item, proposerId: user.id, requested: quantity });
    }

    return offerRepository.create(
      {
        listingId,
        proposerId: user.id,
        quantity: input.quantity,
        message: input.message,
        items: { create: input.items },
      },
      tx,
    );
  });

  return toOfferResponse(offer);
}

export async function listMine(userId, status) {
  const [sent, received] = await Promise.all([
    offerRepository.findSent(userId, status),
    offerRepository.findReceived(userId, status),
  ]);

  return { sent: sent.map(toOfferResponse), received: received.map(toOfferResponse) };
}

export async function getById(userId, id) {
  const offer = await offerRepository.findById(id);
  if (!offer || !isParticipant(offer, userId)) throw new AppError(404, 'Oferta não encontrada');

  return toOfferResponse(offer);
}

export async function changeStatus(userId, id, nextStatus) {
  const found = await offerRepository.findById(id);
  if (!found) throw new AppError(404, 'Oferta não encontrada');

  const offer = await withTransaction(async (tx) => {
    const lockedItems =
      nextStatus === 'ACCEPTED'
        ? await lockInOrder([found.listing.collectionItemId, ...found.items.map((item) => item.collectionItemId)], tx)
        : null;

    const locked = await offerRepository.lockById(id, tx);
    if (!locked) throw new AppError(404, 'Oferta não encontrada');

    const listing = await listingRepository.findById(locked.listingId, tx);

    assertStatusChange({
      offer: locked,
      nextStatus,
      isProposer: locked.proposerId === userId,
      isListingOwner: listing.collectionItem.userId === userId,
    });

    if (nextStatus === 'ACCEPTED') {
      assertListingActive(listing);
      assertStillFulfillable({
        offerQuantity: found.quantity,
        listing,
        offeredItems: found.items.map((item) => ({
          item: lockedItems.get(item.collectionItemId),
          requested: item.quantity,
        })),
      });
    }

    if (RELEASES_ITEMS.includes(nextStatus)) await offerRepository.deleteItems(id, tx);

    return offerRepository.updateStatus(id, nextStatus, tx);
  });

  return toOfferResponse(offer);
}
