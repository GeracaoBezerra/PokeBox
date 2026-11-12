import * as offerController from '../controllers/offerController.js';
import { createOfferRoutes } from '../routes/offer.routes.js';
import { createTradeRoutes } from '../routes/trade.routes.js';
import type { ListingOfferHandlers } from '../routes/listing.routes.js';
import type { AppModule, Infra } from './types.js';

export interface TradingModule extends AppModule {
  offers: ListingOfferHandlers;
}

export function buildTradingModule(infra: Infra): TradingModule {
  return {
    offers: offerController,
    routes: [
      { path: '/offers', router: createOfferRoutes(infra.auth) },
      { path: '/trades', router: createTradeRoutes(infra.auth) },
    ],
  };
}
