import { AppError } from './AppError.js';
import { toCardResponse } from './cardRecord.js';

const FINISH_TO_VARIANT = {
  NORMAL: 'normal',
  HOLO: 'holo',
  REVERSE: 'reverse',
};

export function assertOwner(item, userId) {
  if (item.userId !== userId) {
    throw new AppError(403, 'Este item pertence a outro usuário');
  }
}

export function assertQuantity(quantity, reservedQuantity) {
  if (quantity < reservedQuantity) {
    throw new AppError(
      422,
      `A quantidade não pode ficar abaixo das ${reservedQuantity} unidade(s) reservadas em negociações`,
    );
  }
}

export function assertCoversListings(quantity, reservedQuantity, listedQuantity) {
  if (quantity < reservedQuantity + listedQuantity) {
    throw new AppError(
      422,
      `A quantidade não pode ficar abaixo de ${reservedQuantity + listedQuantity}: este item tem ${listedQuantity} unidade(s) anunciada(s)`,
    );
  }
}

export function assertNotReserved(item) {
  if (item.reservedQuantity > 0) {
    throw new AppError(
      409,
      `Este item tem ${item.reservedQuantity} unidade(s) reservadas em negociações e não pode ser apagado`,
    );
  }
}

export function assertNoListings({ open, total }) {
  if (open > 0) {
    throw new AppError(409, 'Este item tem anúncio aberto. Feche o anúncio antes de remover o item');
  }

  if (total > 0) {
    throw new AppError(
      409,
      'Este item já foi anunciado e fica guardado no histórico. Para tirá-lo do perfil, deixe a quantidade em 0',
    );
  }
}

export function assertNoOffers({ open, accepted }) {
  if (open > 0) {
    throw new AppError(409, 'Esta carta está numa oferta aberta. Cancele a oferta antes de remover o item');
  }

  if (accepted > 0) {
    throw new AppError(409, 'Esta carta está numa oferta aceita, aguardando a troca, e não pode ser removida');
  }
}

export function assertConditionChangeable({ reservedQuantity, offers, listings }) {
  if (reservedQuantity > 0) {
    throw new AppError(409, 'Este item está numa troca em andamento. A condição só pode mudar depois que a troca terminar');
  }

  if (offers.open > 0 || offers.accepted > 0) {
    throw new AppError(
      409,
      'Este item está numa oferta aberta ou aceita. A condição só pode mudar depois que a oferta terminar',
    );
  }

  if (listings.open > 0) {
    throw new AppError(409, 'Este item tem anúncio aberto. Feche o anúncio antes de mudar a condição');
  }
}

export function assertVariant(variants = {}, finish, firstEdition) {
  const hasAnyVariant = Object.values(variants).some(Boolean);
  if (!hasAnyVariant) return;

  if (!variants[FINISH_TO_VARIANT[finish]]) {
    throw new AppError(422, `Esta carta não existe na versão ${finish}`);
  }

  if (firstEdition && !variants.firstEdition) {
    throw new AppError(422, 'Esta carta não existe em 1ª edição');
  }
}

export function toCollectionItemResponse(item) {
  return {
    ...item,
    card: toCardResponse(item.card),
    available: item.quantity - item.reservedQuantity,
  };
}

export function toPublicCollectionItem(item) {
  return {
    id: item.id,
    card: toCardResponse(item.card),
    quantity: item.quantity,
    condition: item.condition,
    finish: item.finish,
    firstEdition: item.firstEdition,
  };
}
