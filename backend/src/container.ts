import type { ErrorRequestHandler } from 'express';

import type { Env } from './config/env.js';
import { AppErrorTranslator } from './errors/translators/AppErrorTranslator.js';
import { BodyParserErrorTranslator } from './errors/translators/BodyParserErrorTranslator.js';
import { PrismaErrorTranslator } from './errors/translators/PrismaErrorTranslator.js';
import { TcgdexErrorTranslator } from './errors/translators/TcgdexErrorTranslator.js';
import { ZodErrorTranslator } from './errors/translators/ZodErrorTranslator.js';
import type { Logger } from './lib/logger.js';
import { createPrismaClient, prisma as legacyPrisma } from './lib/prisma.js';
import { AuthMiddleware } from './middlewares/AuthMiddleware.js';
import { createErrorHandler } from './middlewares/errorHandler.js';
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
  errorHandler: ErrorRequestHandler;
  modules: AppModule[];
  shutdown(): Promise<void>;
}

export function buildInfra(env: Env, logger: Logger = console): Infra {
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

export function buildContainer(env: Env): Container {
  const infra = buildInfra(env);

  const auth = buildAuthModule(infra);

  const cards = buildCardsModule(infra);

  const collection = buildCollectionModule(infra);

  const wishlist = buildWishlistModule(infra, { cards });

  const listings = buildListingsModule(infra);

  const trading = buildTradingModule(infra);

  return {
    infra,
    errorHandler: buildErrorHandler(infra.logger),
    modules: [auth, cards, collection, wishlist, listings, trading],
    async shutdown() {
      await Promise.all([infra.prisma.$disconnect(), legacyPrisma.$disconnect()]);
    },
  };
}
