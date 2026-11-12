import { AppError } from '../errors/AppError.js';
import type { CardCondition, CardFinish } from '../generated/prisma/index.js';
import { toCardResponse } from './cardRecord.js';

const FINISH_TO_VARIANT = {
  NORMAL: 'normal',
  HOLO: 'holo',
  REVERSE: 'reverse',
} as const satisfies Record<CardFinish, string>;

export type CardVariants = Partial<Record<'normal' | 'holo' | 'reverse' | 'firstEdition', boolean>>;

export interface ListingCounts {
  open: number;
  total: number;
}

export interface OfferCounts {
  open: number;
  accepted: number;
}

export interface ConditionChangeContext {
  reservedQuantity: number;
  offers: OfferCounts;
  listings: Pick<ListingCounts, 'open'>;
}

type PricedCard = { marketPrice: unknown };

type ResponseCard<C extends PricedCard> = Omit<C, 'marketPrice'> & { marketPrice: number | null };

export interface CollectionItemSource<C extends PricedCard> {
  quantity: number;
  reservedQuantity: number;
  card: C;
}

export type CollectionItemResponse<T extends CollectionItemSource<PricedCard>> = Omit<T, 'card'> & {
  card: ResponseCard<T['card']>;
  available: number;
};

export interface PublicCollectionItemSource<C extends PricedCard> {
  id: string;
  card: C;
  quantity: number;
  condition: CardCondition;
  finish: CardFinish;
  firstEdition: boolean;
}

export interface PublicCollectionItem<C extends PricedCard> {
  id: string;
  card: ResponseCard<C>;
  quantity: number;
  condition: CardCondition;
  finish: CardFinish;
  firstEdition: boolean;
}

export function assertOwner(item: { userId: string }, userId: string): void {
  if (item.userId !== userId) {
    throw new AppError(403, 'Este item pertence a outro usuário');
  }
}

export function assertQuantity(quantity: number, reservedQuantity: number): void {
  if (quantity < reservedQuantity) {
    throw new AppError(
      422,
      `A quantidade não pode ficar abaixo das ${reservedQuantity} unidade(s) reservadas em negociações`,
    );
  }
}

export function assertCoversListings(quantity: number, reservedQuantity: number, listedQuantity: number): void {
  if (quantity < reservedQuantity + listedQuantity) {
    throw new AppError(
      422,
      `A quantidade não pode ficar abaixo de ${reservedQuantity + listedQuantity}: este item tem ${listedQuantity} unidade(s) anunciada(s)`,
    );
  }
}

export function assertNotReserved(item: { reservedQuantity: number }): void {
  if (item.reservedQuantity > 0) {
    throw new AppError(
      409,
      `Este item tem ${item.reservedQuantity} unidade(s) reservadas em negociações e não pode ser apagado`,
    );
  }
}

export function assertNoListings({ open, total }: ListingCounts): void {
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

export function assertNoOffers({ open, accepted }: OfferCounts): void {
  if (open > 0) {
    throw new AppError(409, 'Esta carta está numa oferta aberta. Cancele a oferta antes de remover o item');
  }

  if (accepted > 0) {
    throw new AppError(409, 'Esta carta está numa oferta aceita, aguardando a troca, e não pode ser removida');
  }
}

export function assertConditionChangeable({ reservedQuantity, offers, listings }: ConditionChangeContext): void {
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

export function assertVariant(variants: CardVariants = {}, finish: CardFinish, firstEdition: boolean): void {
  const hasAnyVariant = Object.values(variants).some(Boolean);
  if (!hasAnyVariant) return;

  if (!variants[FINISH_TO_VARIANT[finish]]) {
    throw new AppError(422, `Esta carta não existe na versão ${finish}`);
  }

  if (firstEdition && !variants.firstEdition) {
    throw new AppError(422, 'Esta carta não existe em 1ª edição');
  }
}

export function toCollectionItemResponse<T extends CollectionItemSource<PricedCard>>(item: T): CollectionItemResponse<T> {
  return {
    ...item,
    card: toCardResponse(item.card),
    available: item.quantity - item.reservedQuantity,
  };
}

export function toPublicCollectionItem<C extends PricedCard>(item: PublicCollectionItemSource<C>): PublicCollectionItem<C> {
  return {
    id: item.id,
    card: toCardResponse(item.card),
    quantity: item.quantity,
    condition: item.condition,
    finish: item.finish,
    firstEdition: item.firstEdition,
  };
}
