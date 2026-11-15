import type { ErrorRequestHandler, RequestHandler } from 'express';
import type { Logger as PinoLogger } from 'pino';

import type { Env } from './config/env.js';
import { AppErrorTranslator } from './errors/translators/AppErrorTranslator.js';
import { BodyParserErrorTranslator } from './errors/translators/BodyParserErrorTranslator.js';
import { PrismaErrorTranslator } from './errors/translators/PrismaErrorTranslator.js';
import { TcgdexErrorTranslator } from './errors/translators/TcgdexErrorTranslator.js';
import { ZodErrorTranslator } from './errors/translators/ZodErrorTranslator.js';
import { createLogger, type Logger } from './lib/logger.js';
import { createPrismaClient } from './lib/prisma.js';
import { AuthMiddleware } from './middlewares/AuthMiddleware.js';
import { createErrorHandler } from './middlewares/errorHandler.js';
import { createRequestLogger } from './middlewares/requestLogger.js';
import { buildAuthModule } from './modules/auth.module.js';
import { buildCardsModule } from './modules/cards.module.js';
import { buildCollectionModule } from './modules/collection.module.js';
import { buildListingsModule } from './modules/listings.module.js';
import { buildTradingModule } from './modules/trading.module.js';
import type { AppModule, Infra } from './modules/types.js';
import { buildWishlistModule } from './modules/wishlist.module.js';
import { PrismaUserRepository } from './repositories/PrismaUserRepository.js';

export interface Container {
  infra: Infra;
  requestLogger: RequestHandler;
  errorHandler: ErrorRequestHandler;
  modules: AppModule[];
  shutdown(): Promise<void>;
}

export function buildInfra(env: Env, logger: Logger): Infra {
  const prisma = createPrismaClient(env.DATABASE_URL);
  const auth = new AuthMiddleware({ users: new PrismaUserRepository(prisma), jwtSecret: env.JWT_SECRET });

  return { env, prisma, auth, logger };
}

export function buildErrorHandler(logger: Logger): ErrorRequestHandler {
  return createErrorHandler(
    [
      new BodyParserErrorTranslator(),
      new ZodErrorTranslator(),
      new AppErrorTranslator(),
      new PrismaErrorTranslator(),
      new TcgdexErrorTranslator(logger),
    ],
    logger,
  );
}

export function buildContainer(env: Env, logger: PinoLogger = createLogger(env)): Container {
  const infra = buildInfra(env, logger);

  const auth = buildAuthModule(infra);

  const trading = buildTradingModule(infra);

  const listings = buildListingsModule(infra, { offers: trading.offers });

  const cards = buildCardsModule(infra, { listings: listings.listingService });

  const collection = buildCollectionModule(infra, { cards });

  const wishlist = buildWishlistModule(infra, { cards });

  return {
    infra,
    requestLogger: createRequestLogger(logger),
    errorHandler: buildErrorHandler(infra.logger),
    modules: [auth, cards, collection, wishlist, listings, trading],
    async shutdown() {
      await infra.prisma.$disconnect();
    },
  };
}
