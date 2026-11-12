import { createListingRoutes } from '../routes/listing.routes.js';
import type { AppModule, Infra } from './types.js';

export function buildListingsModule(infra: Infra): AppModule {
  return {
    routes: [{ path: '/listings', router: createListingRoutes(infra.auth) }],
  };
}
