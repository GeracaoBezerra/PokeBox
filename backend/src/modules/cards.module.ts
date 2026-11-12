import { createCardRoutes } from '../routes/card.routes.js';
import type { AppModule, Infra } from './types.js';

export function buildCardsModule(infra: Infra): AppModule {
  return {
    routes: [{ path: '/cards', router: createCardRoutes(infra.auth) }],
  };
}
