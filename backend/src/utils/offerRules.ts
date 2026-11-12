import { AppError } from '../errors/AppError.js';
import type { CardCondition, CardFinish, ListingStatus, OfferStatus } from '../generated/prisma/index.js';
import { toCardResponse } from './cardRecord.js';
import { toListingResponse, type ListingResponse, type ListingSource } from './listingRules.js';

const RESPONSES_BY_OWNER: readonly OfferStatus[] = ['ACCEPTED', 'REJECTED'];
const ENDS_ACCEPTED: readonly OfferStatus[] = ['REJECTED', 'CANCELED'];

type PricedCard = { marketPrice: unknown };

export interface AvailableItem {
  quantity: number;
  reservedQuantity: number;
}

export interface OwnedItem extends AvailableItem {
  userId: string;
}

export interface ProposalCheck {
  listing: { quantity: number; collectionItem: { userId: string } };
  proposerId: string;
  quantity: number;
}

export interface OfferItemCheck {
  item: OwnedItem;
  proposerId: string;
  requested: number;
}

export interface StatusChangeCheck {
  offer: { status: OfferStatus };
  nextStatus: OfferStatus;
  isProposer: boolean;
  isListingOwner: boolean;
  hasTrade?: boolean;
}

export interface OfferedItemCheck {
  item: AvailableItem;
  requested: number;
}

export interface FulfillableCheck {
  offerQuantity: number;
  listing: { quantity: number };
  offeredItems: OfferedItemCheck[];
}

export interface OfferSource<C extends PricedCard = PricedCard> {
  id: string;
  status: OfferStatus;
  quantity: number;
  message: string | null;
  createdAt: Date;
  respondedAt: Date | null;
  proposer: { username: string; name: string };
  listing: ListingSource<C>;
  items: {
    quantity: number;
    collectionItem: { id: string; condition: CardCondition; finish: CardFinish; firstEdition: boolean; card: C };
  }[];
}

export interface OfferItemResponse<C extends PricedCard = PricedCard> {
  collectionItemId: string;
  quantity: number;
  condition: CardCondition;
  finish: CardFinish;
  firstEdition: boolean;
  card: Omit<C, 'marketPrice'> & { marketPrice: number | null };
}

export interface OfferResponse<C extends PricedCard = PricedCard> {
  id: string;
  status: OfferStatus;
  quantity: number;
  message: string | null;
  createdAt: Date;
  respondedAt: Date | null;
  proposer: { username: string; name: string };
  listing: ListingResponse<C>;
  items: OfferItemResponse<C>[];
}

export function assertCanPropose({ listing, proposerId, quantity }: ProposalCheck): void {
  if (listing.collectionItem.userId === proposerId) {
    throw new AppError(422, 'Você não pode fazer oferta no seu próprio anúncio');
  }

  if (quantity > listing.quantity) {
    throw new AppError(422, `O anúncio tem só ${listing.quantity} unidade(s)`);
  }
}

export function assertOfferItem({ item, proposerId, requested }: OfferItemCheck): void {
  if (item.userId !== proposerId) {
    throw new AppError(403, 'Você só pode oferecer cartas da sua coleção');
  }

  const available = item.quantity - item.reservedQuantity;
  if (requested > available) {
    throw new AppError(422, `Quantidade oferecida acima do que você tem disponível: ${available} unidade(s)`);
  }
}

export function assertStatusChange({ offer, nextStatus, isProposer, isListingOwner, hasTrade }: StatusChangeCheck): void {
  if (!isProposer && !isListingOwner) {
    throw new AppError(403, 'Esta oferta é de outros usuários');
  }

  if (RESPONSES_BY_OWNER.includes(nextStatus) && !isListingOwner) {
    throw new AppError(403, 'Só o dono do anúncio pode aceitar ou recusar a oferta');
  }

  if (nextStatus === 'CANCELED' && !isProposer) {
    throw new AppError(403, 'Só quem fez a oferta pode cancelá-la');
  }

  if (offer.status === 'PROPOSED') return;

  if (offer.status === 'ACCEPTED' && ENDS_ACCEPTED.includes(nextStatus)) {
    if (hasTrade) throw new AppError(409, 'Esta oferta já virou troca');
    return;
  }

  throw new AppError(422, `Oferta já finalizada (${offer.status}) não pode mudar de status`);
}

export function assertListingActive(listing: { status: ListingStatus }): void {
  if (listing.status !== 'ACTIVE') {
    throw new AppError(422, 'Só dá para aceitar oferta de anúncio ativo');
  }
}

export function assertStillFulfillable({ offerQuantity, listing, offeredItems }: FulfillableCheck): void {
  if (offerQuantity > listing.quantity) {
    throw new AppError(
      422,
      `O anúncio agora tem só ${listing.quantity} unidade(s) e a oferta pede ${offerQuantity}. Aumente o anúncio ou encerre a oferta (quem ofertou cancela, o dono recusa)`,
    );
  }

  for (const { item, requested } of offeredItems) {
    const available = item.quantity - item.reservedQuantity;
    if (requested > available) {
      throw new AppError(
        422,
        `Quem fez a oferta não tem mais as cartas oferecidas: ${available} unidade(s) disponível(is), a oferta pede ${requested}`,
      );
    }
  }
}

export function toOfferResponse<C extends PricedCard>(offer: OfferSource<C>): OfferResponse<C> {
  return {
    id: offer.id,
    status: offer.status,
    quantity: offer.quantity,
    message: offer.message,
    createdAt: offer.createdAt,
    respondedAt: offer.respondedAt,
    proposer: { username: offer.proposer.username, name: offer.proposer.name },
    listing: toListingResponse(offer.listing),
    items: offer.items.map(({ quantity, collectionItem }) => ({
      collectionItemId: collectionItem.id,
      quantity,
      condition: collectionItem.condition,
      finish: collectionItem.finish,
      firstEdition: collectionItem.firstEdition,
      card: toCardResponse(collectionItem.card),
    })),
  };
}
