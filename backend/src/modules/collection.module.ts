import { CollectionController } from '../controllers/CollectionController.js';
import { ProfileController } from '../controllers/ProfileController.js';
import * as listingRepository from '../repositories/listingRepository.js';
import * as offerRepository from '../repositories/offerRepository.js';
import { PrismaCollectionRepository } from '../repositories/PrismaCollectionRepository.js';
import { PrismaTransactionRunner } from '../repositories/PrismaTransactionRunner.js';
import { PrismaUserRepository } from '../repositories/PrismaUserRepository.js';
import { PrismaWishlistRepository } from '../repositories/PrismaWishlistRepository.js';
import { createCollectionRoutes } from '../routes/collection.routes.js';
import { createUsersRoutes } from '../routes/users.routes.js';
import { CollectionService } from '../services/CollectionService.js';
import { ProfileService } from '../services/ProfileService.js';
import type { CardsModule } from './cards.module.js';
import type { AppModule, Infra } from './types.js';

export interface CollectionModuleDeps {
  cards: CardsModule;
}

export function buildCollectionModule(infra: Infra, { cards }: CollectionModuleDeps): AppModule {
  const collection = new PrismaCollectionRepository(infra.prisma);

  const collectionService = new CollectionService({
    collection,
    wishlist: new PrismaWishlistRepository(infra.prisma),
    listings: listingRepository,
    offers: offerRepository,
    cards: cards.cardService,
    cardStore: cards.cardRepository,
    transactions: new PrismaTransactionRunner(infra.prisma),
  });
  const profileService = new ProfileService(new PrismaUserRepository(infra.prisma), collection);

  return {
    routes: [
      { path: '/collection', router: createCollectionRoutes(infra.auth, new CollectionController(collectionService)) },
      { path: '/users', router: createUsersRoutes(new ProfileController(profileService)) },
    ],
  };
}
