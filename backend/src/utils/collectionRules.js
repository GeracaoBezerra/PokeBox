import { AppError } from './AppError.js';

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
    available: item.quantity - item.reservedQuantity,
  };
}
