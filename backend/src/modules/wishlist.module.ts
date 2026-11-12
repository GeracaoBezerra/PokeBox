import { WishlistController } from '../controllers/WishlistController.js';
import * as collectionRepository from '../repositories/collectionRepository.js';
import { PrismaWishlistRepository } from '../repositories/PrismaWishlistRepository.js';
import { createWishlistRoutes } from '../routes/wishlist.routes.js';
import { WishlistService } from '../services/WishlistService.js';
import type { CardsModule } from './cards.module.js';
import type { AppModule, Infra } from './types.js';

export interface WishlistModuleDeps {
  cards: CardsModule;
}

export function buildWishlistModule(infra: Infra, { cards }: WishlistModuleDeps): AppModule {
  const wishlist = new PrismaWishlistRepository(infra.prisma);
  const service = new WishlistService(wishlist, collectionRepository, cards.cardService, cards.cardRepository);
  const controller = new WishlistController(service);

  return {
    routes: [{ path: '/wishlist', router: createWishlistRoutes(infra.auth, controller) }],
  };
}
