import type { CardCatalog } from '../cards/catalog/CardCatalog.js';
import { DbCachedCatalog } from '../cards/catalog/DbCachedCatalog.js';
import { InFlightDedupCatalog } from '../cards/catalog/InFlightDedupCatalog.js';
import { MemoryCachedCatalog } from '../cards/catalog/MemoryCachedCatalog.js';
import { MockCatalog } from '../cards/catalog/MockCatalog.js';
import { PrismaCardCacheStore } from '../cards/catalog/PrismaCardCacheStore.js';
import { TcgdexClient } from '../cards/catalog/TcgdexClient.js';
import type { CardFinder } from '../cards/search/CardFinder.js';
import { SmartCardFinder } from '../cards/search/SmartCardFinder.js';
import { CardController } from '../controllers/CardController.js';
import * as listingRepository from '../repositories/listingRepository.js';
import { PrismaCardRepository, type CardRepository } from '../repositories/PrismaCardRepository.js';
import { PrismaCollectionRepository } from '../repositories/PrismaCollectionRepository.js';
import { PrismaWishlistRepository } from '../repositories/PrismaWishlistRepository.js';
import { createCardRoutes } from '../routes/card.routes.js';
import { CardService } from '../services/CardService.js';
import * as listingService from '../services/listing.service.js';
import type { AppModule, Infra } from './types.js';

const ONE_HOUR = 60 * 60 * 1000;
const TEN_MINUTES = 10 * 60 * 1000;
const TCGDEX_TIMEOUT_MS = 8000;

export interface CardsModule extends AppModule {
  cardService: CardService;
  cardRepository: CardRepository;
}

function buildCatalog(infra: Infra, cardRepository: CardRepository): { catalog: CardCatalog; finder: CardFinder } {
  if (infra.env.USE_MOCK) {
    const mock = new MockCatalog();
    return { catalog: mock, finder: mock };
  }

  const client = new TcgdexClient({
    baseUrl: infra.env.TCGDEX_BASE_URL,
    timeoutMs: TCGDEX_TIMEOUT_MS,
    fetch: (url, init) => fetch(url, init),
    logger: infra.logger,
  });
  const dbCached = new DbCachedCatalog(client, {
    store: new PrismaCardCacheStore(infra.prisma),
    prices: cardRepository,
    ttlMs: 24 * ONE_HOUR,
    logger: infra.logger,
  });
  const catalog = new MemoryCachedCatalog(new InFlightDedupCatalog(dbCached), {
    detailTtlMs: ONE_HOUR,
    isCacheable: (card) => !dbCached.isStale(card),
  });

  return { catalog, finder: new SmartCardFinder(catalog, { ttlMs: TEN_MINUTES }) };
}

export function buildCardsModule(infra: Infra): CardsModule {
  const cardRepository = new PrismaCardRepository(infra.prisma);
  const { catalog, finder } = buildCatalog(infra, cardRepository);
  const cardService = new CardService(catalog, finder, {
    collection: new PrismaCollectionRepository(infra.prisma),
    wishlist: new PrismaWishlistRepository(infra.prisma),
    listings: listingRepository,
  });
  const controller = new CardController(cardService, listingService);

  return {
    cardService,
    cardRepository,
    routes: [{ path: '/cards', router: createCardRoutes(controller, infra.auth) }],
  };
}
