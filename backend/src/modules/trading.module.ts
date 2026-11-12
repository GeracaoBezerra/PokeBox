import { createOfferRoutes } from '../routes/offer.routes.js';
import { createTradeRoutes } from '../routes/trade.routes.js';
import type { AppModule, Infra } from './types.js';

export function buildTradingModule(infra: Infra): AppModule {
  return {
    routes: [
      { path: '/offers', router: createOfferRoutes(infra.auth) },
      { path: '/trades', router: createTradeRoutes(infra.auth) },
    ],
  };
}
