import { AppError } from './AppError.js';
import { toCardResponse } from './cardRecord.js';
import { OPEN_STATUSES } from './listingRules.js';

export const TRADE_ACTIONS = {
  accept: { status: 'ACCEPTED', role: 'recipient' },
  reject: { status: 'REJECTED', role: 'recipient' },
  cancel: { status: 'CANCELED', role: 'proposer' },
};

const WRONG_ROLE = {
  recipient: 'Só o dono do anúncio pode aceitar ou recusar a troca',
  proposer: 'Só quem fez a oferta pode cancelar a troca',
};

export function isTradeParty(trade, userId) {
  return trade.proposerId === userId || trade.recipientId === userId;
}

export function assertCanView(trade, userId) {
  if (!isTradeParty(trade, userId)) {
    throw new AppError(403, 'Esta troca é de outros usuários');
  }
}

export function assertCanCreate({ offer, userId }) {
  const ownerId = offer?.listing.collectionItem.userId;

  if (!offer || (offer.proposerId !== userId && ownerId !== userId)) {
    throw new AppError(404, 'Oferta não encontrada');
  }

  if (offer.proposerId !== userId) {
    throw new AppError(403, 'Só quem fez a oferta cria a troca');
  }
}

export function assertOfferTradable({ offer, hasTrade, listing }) {
  if (offer.status !== 'ACCEPTED') {
    throw new AppError(422, 'Só oferta aceita vira troca');
  }

  if (hasTrade) {
    throw new AppError(409, 'Esta oferta já virou troca');
  }

  if (!OPEN_STATUSES.includes(listing.status)) {
    throw new AppError(422, 'O anúncio desta oferta não está mais aberto');
  }
}

export function assertTradeAction({ trade, userId, action }) {
  assertCanView(trade, userId);

  const { role } = TRADE_ACTIONS[action];
  const roleId = role === 'recipient' ? trade.recipientId : trade.proposerId;
  if (roleId !== userId) {
    throw new AppError(403, WRONG_ROLE[role]);
  }

  if (trade.status !== 'PROPOSED') {
    throw new AppError(409, `Troca já finalizada (${trade.status})`);
  }
}

export function assertStillTradable({ item, tradeItem }) {
  const usable =
    item &&
    item.userId === tradeItem.fromUserId &&
    item.quantity >= tradeItem.quantity &&
    item.reservedQuantity >= tradeItem.quantity;

  if (!usable) {
    throw new AppError(422, 'As cartas desta troca não estão mais disponíveis');
  }
}

function copyOf(collectionItem) {
  return {
    collectionItemId: collectionItem.id,
    cardId: collectionItem.cardId,
    condition: collectionItem.condition,
    finish: collectionItem.finish,
    firstEdition: collectionItem.firstEdition,
  };
}

export function buildTradeItems({ offer, listing }) {
  const ownerId = listing.collectionItem.userId;

  return [
    {
      ...copyOf(listing.collectionItem),
      quantity: offer.quantity,
      fromUserId: ownerId,
      toUserId: offer.proposerId,
    },
    ...offer.items.map(({ collectionItem, quantity }) => ({
      ...copyOf(collectionItem),
      quantity,
      fromUserId: offer.proposerId,
      toUserId: ownerId,
    })),
  ];
}

export function nextListingState({ listing, taken }) {
  const remaining = listing.quantity - taken;
  return remaining > 0 ? { quantity: remaining } : { status: 'CLOSED' };
}

export function trimListings({ listings, available }) {
  let listed = listings.reduce((sum, listing) => sum + listing.quantity, 0);
  const changes = [];

  for (const listing of listings) {
    if (listed <= available) break;

    const excess = listed - available;
    if (listing.quantity > excess) {
      changes.push({ id: listing.id, quantity: listing.quantity - excess });
      listed -= excess;
    } else {
      changes.push({ id: listing.id, status: 'CLOSED' });
      listed -= listing.quantity;
    }
  }

  return changes;
}

export function toTradeResponse(trade) {
  return {
    id: trade.id,
    status: trade.status,
    createdAt: trade.createdAt,
    completedAt: trade.completedAt,
    offerId: trade.offerId,
    proposer: { username: trade.proposer.username, name: trade.proposer.name },
    recipient: { username: trade.recipient.username, name: trade.recipient.name },
    items: trade.items.map((item) => ({
      from: item.fromUser.username,
      to: item.toUser.username,
      quantity: item.quantity,
      condition: item.condition,
      finish: item.finish,
      firstEdition: item.firstEdition,
      card: toCardResponse(item.card),
    })),
  };
}
