import { AppError } from '../errors/AppError.js';
import type { CardCondition, CardFinish, ListingStatus } from '../generated/prisma/index.js';
import type { Role } from '../types/auth.js';
import { isPublicProfileVisible, type ProfileVisibility } from './accountStatus.js';
import { toCardResponse } from './cardRecord.js';

export const OPEN_STATUSES: readonly ListingStatus[] = ['ACTIVE', 'PAUSED'];
export const CANCELS_OFFERS: readonly ListingStatus[] = ['CLOSED', 'BLOCKED'];

export interface ListingState {
  quantity: number;
  status: ListingStatus;
}

export interface ListingUpdateInput {
  quantity?: number;
  description?: string | null;
  status?: ListingStatus;
}

export interface ListingUpdateCheck {
  from: ListingStatus;
  input: ListingUpdateInput;
  isOwner: boolean;
  isAdmin: boolean;
}

export interface ListingQuantityCheck {
  requested: number;
  otherListed: number;
  available: number;
}

export interface ListingViewer {
  id: string;
  role: Role;
}

export interface VisibleListing {
  status: ListingStatus;
  collectionItem: { userId: string; user: ProfileVisibility };
}

type PricedCard = { marketPrice: unknown };

export interface ListingSource<C extends PricedCard = PricedCard> {
  id: string;
  quantity: number;
  description: string | null;
  status: ListingStatus;
  createdAt: Date;
  updatedAt: Date;
  collectionItem: {
    id: string;
    condition: CardCondition;
    finish: CardFinish;
    firstEdition: boolean;
    user: { username: string; name: string };
    card: C;
  };
}

export interface ListingResponse<C extends PricedCard = PricedCard> {
  id: string;
  quantity: number;
  description: string | null;
  status: ListingStatus;
  createdAt: Date;
  updatedAt: Date;
  owner: { username: string; name: string };
  item: { id: string; condition: CardCondition; finish: CardFinish; firstEdition: boolean };
  card: Omit<C, 'marketPrice'> & { marketPrice: number | null };
}

export function isOpenStatus(status: ListingStatus): boolean {
  return OPEN_STATUSES.includes(status);
}

export function cancelsOffers(status: ListingStatus | undefined): boolean {
  return status !== undefined && CANCELS_OFFERS.includes(status);
}

export function assertListingQuantity({ requested, otherListed, available }: ListingQuantityCheck): void {
  if (requested + otherListed > available) {
    throw new AppError(
      422,
      `Quantidade acima do que você tem: ${available} unidade(s) disponível(is), ${otherListed} já anunciada(s) em outros anúncios`,
    );
  }
}

export function assertListingUpdate({ from, input, isOwner, isAdmin }: ListingUpdateCheck): void {
  if (!isOwner && !isAdmin) {
    throw new AppError(403, 'Este anúncio pertence a outro usuário');
  }

  if (from === 'CLOSED') {
    throw new AppError(422, 'Anúncio fechado não pode ser alterado');
  }

  if (isOwner) {
    if (from === 'BLOCKED') throw new AppError(403, 'Anúncio bloqueado pela moderação');
    if (input.status === 'BLOCKED') throw new AppError(403, 'Só a moderação pode bloquear um anúncio');
    return;
  }

  if (input.quantity !== undefined || input.description !== undefined) {
    throw new AppError(403, 'A moderação só pode mudar o status do anúncio');
  }

  const unblocking = from === 'BLOCKED' && input.status === 'PAUSED';
  if (input.status !== 'BLOCKED' && !unblocking) {
    throw new AppError(422, 'A moderação só pode bloquear (BLOCKED) ou desbloquear (BLOCKED → PAUSED) um anúncio');
  }
}

export function needsStockCheck(current: ListingState, next: ListingState): boolean {
  if (!isOpenStatus(next.status)) return false;
  if (!isOpenStatus(current.status)) return true;
  return next.quantity > current.quantity;
}

export function mayCancelAccepted(current: ListingState, next: ListingState): boolean {
  return cancelsOffers(next.status) || next.quantity < current.quantity;
}

export function isListingVisible(listing: VisibleListing, viewer: ListingViewer | null | undefined): boolean {
  if (viewer && (viewer.role === 'ADMIN' || viewer.id === listing.collectionItem.userId)) return true;
  return listing.status === 'ACTIVE' && isPublicProfileVisible(listing.collectionItem.user);
}

export function toListingResponse<C extends PricedCard>(listing: ListingSource<C>): ListingResponse<C> {
  const item = listing.collectionItem;

  return {
    id: listing.id,
    quantity: listing.quantity,
    description: listing.description,
    status: listing.status,
    createdAt: listing.createdAt,
    updatedAt: listing.updatedAt,
    owner: { username: item.user.username, name: item.user.name },
    item: {
      id: item.id,
      condition: item.condition,
      finish: item.finish,
      firstEdition: item.firstEdition,
    },
    card: toCardResponse(item.card),
  };
}
