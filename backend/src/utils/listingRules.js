import { AppError } from '../errors/AppError.js';
import { isPublicProfileVisible } from './accountStatus.js';
import { toCardResponse } from './cardRecord.js';

export const OPEN_STATUSES = ['ACTIVE', 'PAUSED'];
export const CANCELS_OFFERS = ['CLOSED', 'BLOCKED'];

export function assertListingQuantity({ requested, otherListed, available }) {
  if (requested + otherListed > available) {
    throw new AppError(
      422,
      `Quantidade acima do que você tem: ${available} unidade(s) disponível(is), ${otherListed} já anunciada(s) em outros anúncios`,
    );
  }
}

export function assertListingUpdate({ from, input, isOwner, isAdmin }) {
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

export function needsStockCheck(current, next) {
  if (!OPEN_STATUSES.includes(next.status)) return false;
  if (!OPEN_STATUSES.includes(current.status)) return true;
  return next.quantity > current.quantity;
}

export function mayCancelAccepted(current, next) {
  return CANCELS_OFFERS.includes(next.status) || next.quantity < current.quantity;
}

export function isListingVisible(listing, viewer) {
  if (viewer && (viewer.role === 'ADMIN' || viewer.id === listing.collectionItem.userId)) return true;
  return listing.status === 'ACTIVE' && isPublicProfileVisible(listing.collectionItem.user);
}

export function toListingResponse(listing) {
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
