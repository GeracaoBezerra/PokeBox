import * as collectionRepository from '../repositories/legacyCollectionRepository.js';
import * as listingRepository from '../repositories/listingRepository.js';
import * as offerRepository from '../repositories/offerRepository.js';
import * as tradeRepository from '../repositories/tradeRepository.js';
import * as wishlistRepository from '../repositories/legacyWishlistRepository.js';
import { lockInOrder, withTransaction } from '../repositories/transaction.js';
import { AppError } from '../errors/AppError.js';
import { assertStillFulfillable } from '../utils/offerRules.js';
import {
  TRADE_ACTIONS,
  acceptedOffersToCancel,
  assertCanCreate,
  assertCanView,
  assertOfferTradable,
  assertStillTradable,
  assertTradeAction,
  buildTradeItems,
  nextListingState,
  toTradeResponse,
  trimListings,
} from '../utils/tradeRules.js';

async function applyListingChange(change, tx) {
  const { id, ...data } = change;
  await listingRepository.update(id, data, tx);
  if (data.status === 'CLOSED') await offerRepository.cancelOpenByListing(id, tx);

  const accepted = await offerRepository.lockAcceptedWithoutTrade(id, tx);
  await offerRepository.cancelByIds(acceptedOffersToCancel({ offers: accepted, change: data }), tx);
}

async function trimProposerListings(item, tx) {
  const listings = await listingRepository.findOpenByItem(item.id, tx);
  const changes = trimListings({ listings, available: item.quantity - item.reservedQuantity });
  for (const change of changes) await applyListingChange(change, tx);
}

function originIds(trade) {
  return trade.items.map((item) => item.collectionItemId).filter(Boolean);
}

function destinationKeys(trade) {
  return trade.items.map(({ toUserId, cardId, condition, finish, firstEdition }) => ({
    userId: toUserId,
    cardId,
    condition,
    finish,
    firstEdition,
  }));
}

async function findTradeOf(userId, id) {
  const trade = await tradeRepository.findById(id);
  if (!trade) throw new AppError(404, 'Troca não encontrada');
  assertCanView(trade, userId);
  return trade;
}

async function lockTrade(id, tx) {
  const locked = await tradeRepository.lockById(id, tx);
  if (!locked) throw new AppError(404, 'Troca não encontrada');
  return locked;
}

export async function create(userId, offerId) {
  const found = await offerRepository.findById(offerId);
  assertCanCreate({ offer: found, userId });

  const trade = await withTransaction(async (tx) => {
    const offeredIds = found.items.map((item) => item.collectionItemId);
    const locked = await lockInOrder([found.listing.collectionItemId, ...offeredIds], tx);

    if (!(await offerRepository.lockById(offerId, tx))) throw new AppError(404, 'Oferta não encontrada');
    const offer = await offerRepository.findById(offerId, tx);
    const listing = await listingRepository.findById(offer.listingId, tx);

    assertOfferTradable({
      offer,
      hasTrade: Boolean(await tradeRepository.findByOfferId(offerId, tx)),
      listing,
    });
    assertStillFulfillable({
      offerQuantity: offer.quantity,
      listing,
      offeredItems: offer.items.map((item) => ({
        item: locked.get(item.collectionItemId),
        requested: item.quantity,
      })),
    });

    const items = buildTradeItems({ offer, listing });
    const created = await tradeRepository.create(
      {
        proposerId: offer.proposerId,
        recipientId: listing.collectionItem.userId,
        offerId,
        items: { create: items },
      },
      tx,
    );

    for (const { collectionItemId, quantity } of items) {
      await collectionRepository.reserve(collectionItemId, quantity, tx);
    }

    await applyListingChange({ id: listing.id, ...nextListingState({ listing, taken: offer.quantity }) }, tx);

    for (const { collectionItem, quantity } of offer.items) {
      const item = locked.get(collectionItem.id);
      await trimProposerListings({ ...item, reservedQuantity: item.reservedQuantity + quantity }, tx);
    }

    await offerRepository.deleteItems(offerId, tx);

    return created;
  });

  return toTradeResponse(trade);
}

export async function listMine(userId, status) {
  const [sent, received] = await Promise.all([
    tradeRepository.findSent(userId, status),
    tradeRepository.findReceived(userId, status),
  ]);

  return { sent: sent.map(toTradeResponse), received: received.map(toTradeResponse) };
}

export async function getById(userId, id) {
  return toTradeResponse(await findTradeOf(userId, id));
}

export async function accept(userId, id) {
  const found = await findTradeOf(userId, id);
  const destinationIds = await collectionRepository.findIdsByKeys(destinationKeys(found));

  const trade = await withTransaction(async (tx) => {
    const locked = await lockInOrder([...originIds(found), ...destinationIds], tx);
    assertTradeAction({ trade: await lockTrade(id, tx), userId, action: 'accept' });

    for (const tradeItem of found.items) {
      assertStillTradable({ item: tradeItem.collectionItemId && locked.get(tradeItem.collectionItemId), tradeItem });
    }

    for (const tradeItem of found.items) {
      await collectionRepository.transferOut(tradeItem.collectionItemId, tradeItem.quantity, tx);
      await collectionRepository.addOrIncrement(
        {
          userId: tradeItem.toUserId,
          cardId: tradeItem.cardId,
          condition: tradeItem.condition,
          finish: tradeItem.finish,
          firstEdition: tradeItem.firstEdition,
          quantity: tradeItem.quantity,
          isPublic: true,
        },
        tx,
      );
      await wishlistRepository.removeByUserAndCard(tradeItem.toUserId, tradeItem.cardId, tx);
    }

    return tradeRepository.updateStatus(id, TRADE_ACTIONS.accept.status, tx);
  });

  return toTradeResponse(trade);
}

async function undo(userId, id, action) {
  const found = await findTradeOf(userId, id);

  const trade = await withTransaction(async (tx) => {
    await lockInOrder(originIds(found), tx);
    assertTradeAction({ trade: await lockTrade(id, tx), userId, action });

    for (const tradeItem of found.items) {
      if (tradeItem.collectionItemId) {
        await collectionRepository.release(tradeItem.collectionItemId, tradeItem.quantity, tx);
      }
    }

    return tradeRepository.updateStatus(id, TRADE_ACTIONS[action].status, tx);
  });

  return toTradeResponse(trade);
}

export function reject(userId, id) {
  return undo(userId, id, 'reject');
}

export function cancel(userId, id) {
  return undo(userId, id, 'cancel');
}
