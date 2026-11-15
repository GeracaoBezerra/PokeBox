import { ListingController } from '../controllers/ListingController.js';
import { PrismaCollectionRepository } from '../repositories/PrismaCollectionRepository.js';
import { PrismaListingRepository } from '../repositories/PrismaListingRepository.js';
import { PrismaOfferRepository } from '../repositories/PrismaOfferRepository.js';
import { PrismaTransactionRunner } from '../repositories/PrismaTransactionRunner.js';
import { createListingRoutes, type ListingOfferHandlers } from '../routes/listing.routes.js';
import { ListingChangeApplier } from '../services/ListingChangeApplier.js';
import { ListingService } from '../services/ListingService.js';
import type { AppModule, Infra } from './types.js';

export interface ListingsModuleDeps {
  offers: ListingOfferHandlers;
}

export interface ListingsModule extends AppModule {
  listingService: ListingService;
}

export function buildListingsModule(infra: Infra, { offers }: ListingsModuleDeps): ListingsModule {
  const listings = new PrismaListingRepository(infra.prisma);
  const listingService = new ListingService({
    listings,
    collection: new PrismaCollectionRepository(infra.prisma),
    transactions: new PrismaTransactionRunner(infra.prisma),
    changes: new ListingChangeApplier(listings, new PrismaOfferRepository(infra.prisma)),
  });

  return {
    listingService,
    routes: [{ path: '/listings', router: createListingRoutes(infra.auth, new ListingController(listingService), offers) }],
  };
}
