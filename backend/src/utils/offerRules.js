import { AppError } from './AppError.js';
import { toCardResponse } from './cardRecord.js';
import { toListingResponse } from './listingRules.js';

const RESPONSES_BY_OWNER = ['ACCEPTED', 'REJECTED'];

export function assertCanPropose({ listing, proposerId, quantity }) {
  if (listing.collectionItem.userId === proposerId) {
    throw new AppError(422, 'Você não pode fazer oferta no seu próprio anúncio');
  }

  if (quantity > listing.quantity) {
    throw new AppError(422, `O anúncio tem só ${listing.quantity} unidade(s)`);
  }
}

export function assertOfferItem({ item, proposerId, requested }) {
  if (item.userId !== proposerId) {
    throw new AppError(403, 'Você só pode oferecer cartas da sua coleção');
  }

  const available = item.quantity - item.reservedQuantity;
  if (requested > available) {
    throw new AppError(422, `Quantidade oferecida acima do que você tem disponível: ${available} unidade(s)`);
  }
}

export function assertStatusChange({ offer, nextStatus, isProposer, isListingOwner }) {
  if (!isProposer && !isListingOwner) {
    throw new AppError(403, 'Esta oferta é de outros usuários');
  }

  if (RESPONSES_BY_OWNER.includes(nextStatus) && !isListingOwner) {
    throw new AppError(403, 'Só o dono do anúncio pode aceitar ou recusar a oferta');
  }

  if (nextStatus === 'CANCELED' && !isProposer) {
    throw new AppError(403, 'Só quem fez a oferta pode cancelá-la');
  }

  if (offer.status !== 'PROPOSED') {
    throw new AppError(422, `Oferta já finalizada (${offer.status}) não pode mudar de status`);
  }
}

export function assertListingActive(listing) {
  if (listing.status !== 'ACTIVE') {
    throw new AppError(422, 'Só dá para aceitar oferta de anúncio ativo');
  }
}

export function toOfferResponse(offer) {
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
