import { ConflictError, NotFoundError } from '../errors/domainErrors.js';
import type { OfferStatus } from '../generated/prisma/index.js';
import type { ListingReader, ListingWithItem } from '../repositories/ListingRepository.js';
import type { OfferRepository, OfferWithDetails } from '../repositories/OfferRepository.js';
import type { UnitOfWorkFactory } from '../repositories/UnitOfWork.js';
import type { CreateOfferInput, OfferStatusChange } from '../schemas/offer.schema.js';
import { isListingVisible, type ListingViewer } from '../utils/listingRules.js';
import {
  assertCanPropose,
  assertListingActive,
  assertOfferItem,
  assertStatusChange,
  assertStillFulfillable,
  toOfferResponse,
  type OfferResponse,
} from '../utils/offerRules.js';

export type OfferReader = Pick<OfferRepository, 'findById' | 'findSent' | 'findReceived'>;

export interface OfferServiceDeps {
  listings: ListingReader;
  offers: OfferReader;
  unitOfWork: UnitOfWorkFactory;
}

export type OfferView = OfferResponse<OfferWithDetails['listing']['collectionItem']['card']>;

export interface MyOffers {
  sent: OfferView[];
  received: OfferView[];
}

const RELEASES_ITEMS: readonly OfferStatus[] = ['REJECTED', 'CANCELED'];
const OFFER_NOT_FOUND = 'Oferta não encontrada';
const LISTING_NOT_FOUND = 'Anúncio não encontrado';
const ITEM_NOT_FOUND = 'Item da coleção não encontrado';

function isParticipant(offer: OfferWithDetails, userId: string): boolean {
  return offer.proposerId === userId || offer.listing.collectionItem.userId === userId;
}

function assertCanReceiveOffers(
  listing: ListingWithItem | null,
  user: ListingViewer,
): asserts listing is ListingWithItem {
  if (!listing || !isListingVisible(listing, user) || listing.status !== 'ACTIVE') {
    throw new NotFoundError(LISTING_NOT_FOUND);
  }
}

export class OfferService {
  constructor(private readonly deps: OfferServiceDeps) {}

  async create(user: ListingViewer, listingId: string, input: CreateOfferInput): Promise<OfferView> {
    const found = await this.deps.listings.findById(listingId);
    assertCanReceiveOffers(found, user);

    const offer = await this.deps.unitOfWork.run(async (uow) => {
      const offeredIds = input.items.map((item) => item.collectionItemId);
      const locked = await uow.lockItemsInOrder([found.collectionItemId, ...offeredIds]);

      const listing = await uow.listings.findById(listingId);
      assertCanReceiveOffers(listing, user);
      assertCanPropose({ listing, proposerId: user.id, quantity: input.quantity });

      if (await uow.offers.findOpenByProposerAndListing(user.id, listingId)) {
        throw new ConflictError('Você já tem uma oferta aberta neste anúncio. Cancele a anterior para fazer outra');
      }

      for (const { collectionItemId, quantity } of input.items) {
        const item = locked.get(collectionItemId);
        if (!item) throw new NotFoundError(ITEM_NOT_FOUND);
        assertOfferItem({ item, proposerId: user.id, requested: quantity });
      }

      return uow.offers.create({
        listingId,
        proposerId: user.id,
        quantity: input.quantity,
        message: input.message,
        items: input.items,
      });
    });

    return toOfferResponse(offer);
  }

  async listMine(userId: string, status?: OfferStatus): Promise<MyOffers> {
    const [sent, received] = await Promise.all([
      this.deps.offers.findSent(userId, status),
      this.deps.offers.findReceived(userId, status),
    ]);

    return {
      sent: sent.map((offer) => toOfferResponse(offer)),
      received: received.map((offer) => toOfferResponse(offer)),
    };
  }

  async getById(userId: string, id: string): Promise<OfferView> {
    const offer = await this.deps.offers.findById(id);
    if (!offer || !isParticipant(offer, userId)) throw new NotFoundError(OFFER_NOT_FOUND);

    return toOfferResponse(offer);
  }

  async changeStatus(userId: string, id: string, nextStatus: OfferStatusChange): Promise<OfferView> {
    const found = await this.deps.offers.findById(id);
    if (!found) throw new NotFoundError(OFFER_NOT_FOUND);

    const offer = await this.deps.unitOfWork.run(async (uow) => {
      const lockedItems =
        nextStatus === 'ACCEPTED'
          ? await uow.lockItemsInOrder([
              found.listing.collectionItemId,
              ...found.items.map((item) => item.collectionItemId),
            ])
          : null;

      const locked = await uow.offers.lockById(id);
      if (!locked) throw new NotFoundError(OFFER_NOT_FOUND);

      const listing = await uow.listings.findById(locked.listingId);
      if (!listing) throw new NotFoundError(OFFER_NOT_FOUND);

      assertStatusChange({
        offer: locked,
        nextStatus,
        isProposer: locked.proposerId === userId,
        isListingOwner: listing.collectionItem.userId === userId,
        hasTrade: locked.status === 'ACCEPTED' && Boolean(await uow.trades.findByOfferId(id)),
      });

      if (lockedItems) {
        assertListingActive(listing);
        assertStillFulfillable({
          offerQuantity: found.quantity,
          listing,
          offeredItems: found.items.map((item) => {
            const lockedItem = lockedItems.get(item.collectionItemId);
            if (!lockedItem) throw new NotFoundError(ITEM_NOT_FOUND);
            return { item: lockedItem, requested: item.quantity };
          }),
        });
      }

      if (RELEASES_ITEMS.includes(nextStatus)) await uow.offers.deleteItems(id);

      return uow.offers.updateStatus(id, nextStatus);
    });

    return toOfferResponse(offer);
  }
}
