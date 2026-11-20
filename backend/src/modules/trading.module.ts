import { OfferController } from '../controllers/OfferController.js';
import { TradeController } from '../controllers/TradeController.js';
import { PrismaCollectionRepository } from '../repositories/PrismaCollectionRepository.js';
import { PrismaListingRepository } from '../repositories/PrismaListingRepository.js';
import { PrismaOfferRepository } from '../repositories/PrismaOfferRepository.js';
import { PrismaTradeRepository } from '../repositories/PrismaTradeRepository.js';
import { PrismaTransactionRunner } from '../repositories/PrismaTransactionRunner.js';
import { PrismaUnitOfWorkFactory } from '../repositories/PrismaUnitOfWorkFactory.js';
import type { ListingOfferHandlers } from '../routes/listing.routes.js';
import { createOfferRoutes } from '../routes/offer.routes.js';
import { createTradeRoutes } from '../routes/trade.routes.js';
import { OfferService } from '../services/OfferService.js';
import { TradeOpener } from '../services/TradeOpener.js';
import { TradeService } from '../services/TradeService.js';
import type { AppModule, Infra } from './types.js';

export interface TradingModule extends AppModule {
  offers: ListingOfferHandlers;
}

export function buildTradingModule(infra: Infra): TradingModule {
  const offers = new PrismaOfferRepository(infra.prisma);
  const unitOfWork = new PrismaUnitOfWorkFactory(new PrismaTransactionRunner(infra.prisma));
  const opener = new TradeOpener();

  const offerController = new OfferController(
    new OfferService({ listings: new PrismaListingRepository(infra.prisma), offers, unitOfWork, opener }),
  );
  const tradeController = new TradeController(
    new TradeService({
      offers,
      trades: new PrismaTradeRepository(infra.prisma),
      collection: new PrismaCollectionRepository(infra.prisma),
      unitOfWork,
      opener,
    }),
  );

  return {
    offers: offerController,
    routes: [
      { path: '/offers', router: createOfferRoutes(infra.auth, offerController) },
      { path: '/trades', router: createTradeRoutes(infra.auth, tradeController) },
    ],
  };
}
