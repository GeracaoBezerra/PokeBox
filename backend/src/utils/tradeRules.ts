import { AppError } from '../errors/AppError.js';
import type { CardCondition, CardFinish, ListingStatus, OfferStatus, TradeStatus } from '../generated/prisma/index.js';
import { toCardResponse } from './cardRecord.js';
import { cancelsOffers, isOpenStatus } from './listingRules.js';
import type { OwnedItem } from './offerRules.js';

export type TradeRole = 'recipient' | 'proposer';

export type TradeAction = 'accept' | 'reject' | 'cancel';

export const TRADE_ACTIONS = {
  accept: { status: 'ACCEPTED', role: 'recipient' },
  reject: { status: 'REJECTED', role: 'recipient' },
  cancel: { status: 'CANCELED', role: 'proposer' },
} as const satisfies Record<TradeAction, { status: TradeStatus; role: TradeRole }>;

const WRONG_ROLE: Record<TradeRole, string> = {
  recipient: 'Só o dono do anúncio pode aceitar ou recusar a troca',
  proposer: 'Só quem fez a oferta pode cancelar a troca',
};

type PricedCard = { marketPrice: unknown };

export interface TradeParties {
  proposerId: string;
  recipientId: string;
}

export interface CreatableOffer {
  proposerId: string;
  listing: { collectionItem: { userId: string } };
}

export interface TradableCheck {
  offer: { status: OfferStatus };
  hasTrade: boolean;
  listing: { status: ListingStatus };
}

export interface TradeActionCheck {
  trade: TradeParties & { status: TradeStatus };
  userId: string;
  action: TradeAction;
}

export interface StillTradableCheck<T extends OwnedItem = OwnedItem> {
  item: T | null | undefined;
  tradeItem: { fromUserId: string; quantity: number };
}

export interface CardCopy {
  cardId: string;
  condition: CardCondition;
  finish: CardFinish;
  firstEdition: boolean;
}

export interface CopiedItem extends CardCopy {
  id: string;
}

export interface NewTradeItem extends CardCopy {
  collectionItemId: string;
  quantity: number;
  fromUserId: string;
  toUserId: string;
}

export interface TradeItemsSource {
  offer: { proposerId: string; quantity: number; items: { quantity: number; collectionItem: CopiedItem }[] };
  listing: { collectionItem: CopiedItem & { userId: string } };
}

export interface ListingChange {
  quantity?: number;
  status?: ListingStatus;
}

export interface ListingTrim extends ListingChange {
  id: string;
}

export interface TradeSource<C extends PricedCard = PricedCard> {
  id: string;
  status: TradeStatus;
  createdAt: Date;
  completedAt: Date | null;
  offerId: string | null;
  proposer: { username: string; name: string };
  recipient: { username: string; name: string };
  items: {
    quantity: number;
    condition: CardCondition;
    finish: CardFinish;
    firstEdition: boolean;
    fromUser: { username: string };
    toUser: { username: string };
    card: C;
  }[];
}

export interface TradeItemResponse<C extends PricedCard = PricedCard> {
  from: string;
  to: string;
  quantity: number;
  condition: CardCondition;
  finish: CardFinish;
  firstEdition: boolean;
  card: Omit<C, 'marketPrice'> & { marketPrice: number | null };
}

export interface TradeResponse<C extends PricedCard = PricedCard> {
  id: string;
  status: TradeStatus;
  createdAt: Date;
  completedAt: Date | null;
  offerId: string | null;
  proposer: { username: string; name: string };
  recipient: { username: string; name: string };
  items: TradeItemResponse<C>[];
}

export function isTradeParty(trade: TradeParties, userId: string): boolean {
  return trade.proposerId === userId || trade.recipientId === userId;
}

export function assertCanView(trade: TradeParties, userId: string): void {
  if (!isTradeParty(trade, userId)) {
    throw new AppError(403, 'Esta troca é de outros usuários');
  }
}

export function assertCanCreate({ offer, userId }: { offer: CreatableOffer | null | undefined; userId: string }): void {
  const ownerId = offer?.listing.collectionItem.userId;

  if (!offer || (offer.proposerId !== userId && ownerId !== userId)) {
    throw new AppError(404, 'Oferta não encontrada');
  }

  if (offer.proposerId !== userId) {
    throw new AppError(403, 'Só quem fez a oferta cria a troca');
  }
}

export function assertOfferTradable({ offer, hasTrade, listing }: TradableCheck): void {
  if (offer.status !== 'ACCEPTED') {
    throw new AppError(422, 'Só oferta aceita vira troca');
  }

  if (hasTrade) {
    throw new AppError(409, 'Esta oferta já virou troca');
  }

  if (!isOpenStatus(listing.status)) {
    throw new AppError(422, 'O anúncio desta oferta não está mais aberto');
  }
}

export function assertTradeAction({ trade, userId, action }: TradeActionCheck): void {
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

export function assertStillTradable<T extends OwnedItem>(
  check: StillTradableCheck<T>,
): asserts check is StillTradableCheck<T> & { item: T } {
  const { item, tradeItem } = check;
  const usable =
    item &&
    item.userId === tradeItem.fromUserId &&
    item.quantity >= tradeItem.quantity &&
    item.reservedQuantity >= tradeItem.quantity;

  if (!usable) {
    throw new AppError(422, 'As cartas desta troca não estão mais disponíveis');
  }
}

function copyOf(collectionItem: CopiedItem): CardCopy & { collectionItemId: string } {
  return {
    collectionItemId: collectionItem.id,
    cardId: collectionItem.cardId,
    condition: collectionItem.condition,
    finish: collectionItem.finish,
    firstEdition: collectionItem.firstEdition,
  };
}

export function buildTradeItems({ offer, listing }: TradeItemsSource): NewTradeItem[] {
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

export function nextListingState({ listing, taken }: { listing: { quantity: number }; taken: number }): ListingChange {
  const remaining = listing.quantity - taken;
  return remaining > 0 ? { quantity: remaining } : { status: 'CLOSED' };
}

export function acceptedOffersToCancel({
  offers,
  change,
}: {
  offers: { id: string; quantity: number }[];
  change: ListingChange;
}): string[] {
  return offers
    .filter(
      (offer) => cancelsOffers(change.status) || (change.quantity !== undefined && offer.quantity > change.quantity),
    )
    .map((offer) => offer.id);
}

export function trimListings({
  listings,
  available,
}: {
  listings: { id: string; quantity: number }[];
  available: number;
}): ListingTrim[] {
  let listed = listings.reduce((sum, listing) => sum + listing.quantity, 0);
  const changes: ListingTrim[] = [];

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

export function toTradeResponse<C extends PricedCard>(trade: TradeSource<C>): TradeResponse<C> {
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
