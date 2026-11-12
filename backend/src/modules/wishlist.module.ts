import { createWishlistRoutes } from '../routes/wishlist.routes.js';
import type { AppModule, Infra } from './types.js';

export function buildWishlistModule(infra: Infra): AppModule {
  return {
    routes: [{ path: '/wishlist', router: createWishlistRoutes(infra.auth) }],
  };
}
