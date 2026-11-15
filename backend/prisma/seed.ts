import { readFile } from 'node:fs/promises';

import bcrypt from 'bcrypt';

import { loadSeedEnv } from '../src/config/env.js';
import type {
  AccountStatus,
  CardCondition,
  CardFinish,
  CollectionItem,
  Listing,
  OfferStatus,
  Prisma,
  TradeStatus,
  User,
  UserRole,
} from '../src/generated/prisma/index.js';
import { createPrismaClient } from '../src/lib/prisma.js';
import { PrismaCollectionRepository } from '../src/repositories/PrismaCollectionRepository.js';
import { PrismaListingRepository } from '../src/repositories/PrismaListingRepository.js';
import { PrismaOfferRepository } from '../src/repositories/PrismaOfferRepository.js';
import { PrismaTradeRepository } from '../src/repositories/PrismaTradeRepository.js';
import { PrismaTransactionRunner } from '../src/repositories/PrismaTransactionRunner.js';
import { PrismaUnitOfWorkFactory } from '../src/repositories/PrismaUnitOfWorkFactory.js';
import { ListingChangeApplier } from '../src/services/ListingChangeApplier.js';
import { ListingService } from '../src/services/ListingService.js';
import { OfferService } from '../src/services/OfferService.js';
import { TradeService } from '../src/services/TradeService.js';
import { assertVariant, type CardVariants } from '../src/utils/collectionRules.js';

const env = loadSeedEnv();
const prisma = createPrismaClient(env.DATABASE_URL);

const SALT_ROUNDS = 12;
const ONE_DAY = 24 * 60 * 60 * 1000;

const RETIRED_ITEMS = [{ username: 'misty', cardId: 'sve-002' }];

interface SeedUser {
  username: string;
  name: string;
  email: string;
  role: UserRole;
  city?: string;
  state?: string;
  accountStatus?: AccountStatus;
}

interface SeedCollectionItem {
  key: string;
  username: string;
  cardId: string;
  condition: CardCondition;
  finish: CardFinish;
  firstEdition?: boolean;
  quantity: number;
  isPublic?: boolean;
}

interface SeedWishlistItem {
  username: string;
  cardId: string;
}

interface SeedListing {
  item: string;
  quantity: number;
  description: string;
  daysAgo: number;
  status?: 'PAUSED' | 'CLOSED' | 'BLOCKED';
}

interface SeedOfferItem {
  item: string;
  quantity: number;
}

interface SeedOffer {
  listing: string;
  proposer: string;
  quantity: number;
  message: string;
  items: SeedOfferItem[];
  status: OfferStatus;
  trade?: Extract<TradeStatus, 'PROPOSED' | 'ACCEPTED'>;
}

type SeedCard = Omit<Prisma.CardCreateInput, 'releaseDate' | 'marketPriceUpdatedAt'> & {
  variants?: CardVariants;
  releaseDate?: string | null;
  marketPriceUpdatedAt?: string | null;
};

type UsersByUsername = Record<string, User>;
type ItemsByKey = Record<string, CollectionItem>;
type ListingsByItem = Record<string, Listing>;

const users: SeedUser[] = [
  { username: 'admin', name: 'Admin PokeBox', email: 'admin@pokebox.dev', role: 'ADMIN' },
  { username: 'ash', name: 'Ash Ketchum', email: 'ash@pokebox.dev', role: 'USER', city: 'São Paulo', state: 'SP' },
  { username: 'misty', name: 'Misty Waterflower', email: 'misty@pokebox.dev', role: 'USER', city: 'Rio de Janeiro', state: 'RJ' },
  { username: 'brock', name: 'Brock Harrison', email: 'brock@pokebox.dev', role: 'USER', city: 'Belo Horizonte', state: 'MG' },
  { username: 'gary', name: 'Gary Oak', email: 'gary@pokebox.dev', role: 'USER', city: 'Curitiba', state: 'PR' },
  { username: 'erika', name: 'Erika Tamao', email: 'erika@pokebox.dev', role: 'USER', city: 'Porto Alegre', state: 'RS' },
  { username: 'dawn', name: 'Dawn Berlitz', email: 'dawn@pokebox.dev', role: 'USER', city: 'Recife', state: 'PE' },
  { username: 'cynthia', name: 'Cynthia Shirona', email: 'cynthia@pokebox.dev', role: 'USER', city: 'Florianópolis', state: 'SC' },
  {
    username: 'lance',
    name: 'Lance Wataru',
    email: 'lance@pokebox.dev',
    role: 'USER',
    city: 'Salvador',
    state: 'BA',
    accountStatus: 'INACTIVE',
  },
];

const collection: SeedCollectionItem[] = [
  { key: 'ash-charizard', username: 'ash', cardId: 'base1-4', condition: 'NEAR_MINT', finish: 'HOLO', firstEdition: true, quantity: 1 },
  { key: 'ash-pikachu-base', username: 'ash', cardId: 'base1-58', condition: 'GOOD', finish: 'NORMAL', quantity: 3 },
  { key: 'ash-pikachu-151', username: 'ash', cardId: 'sv03.5-025', condition: 'NEAR_MINT', finish: 'NORMAL', quantity: 2 },
  { key: 'ash-pikachu-151-reverse', username: 'ash', cardId: 'sv03.5-025', condition: 'MINT', finish: 'REVERSE', quantity: 1 },
  { key: 'ash-furret', username: 'ash', cardId: 'swsh3-136', condition: 'MINT', finish: 'REVERSE', quantity: 1, isPublic: false },
  { key: 'ash-ultra-ball', username: 'ash', cardId: 'sv01-196', condition: 'NEAR_MINT', finish: 'NORMAL', quantity: 4 },
  { key: 'ash-charmander-base', username: 'ash', cardId: 'base1-46', condition: 'EXCELLENT', finish: 'NORMAL', quantity: 2 },
  { key: 'ash-pikachu-vmax', username: 'ash', cardId: 'swsh4-44', condition: 'NEAR_MINT', finish: 'HOLO', quantity: 1 },
  { key: 'ash-pikachu-ex', username: 'ash', cardId: 'sv08-057', condition: 'NEAR_MINT', finish: 'HOLO', quantity: 1 },
  { key: 'ash-greninja', username: 'ash', cardId: 'xy1-41', condition: 'LIGHT_PLAYED', finish: 'NORMAL', quantity: 1 },
  { key: 'ash-lightning-energy', username: 'ash', cardId: 'sv01-257', condition: 'NEAR_MINT', finish: 'HOLO', quantity: 2, isPublic: false },
  { key: 'ash-rowlet', username: 'ash', cardId: 'sm1-9', condition: 'NEAR_MINT', finish: 'NORMAL', quantity: 3 },
  { key: 'ash-pikachu-jungle', username: 'ash', cardId: 'base2-60', condition: 'GOOD', finish: 'NORMAL', quantity: 1 },

  { key: 'misty-blastoise', username: 'misty', cardId: 'base1-2', condition: 'MINT', finish: 'HOLO', quantity: 1 },
  { key: 'misty-mew', username: 'misty', cardId: 'sv03.5-151', condition: 'NEAR_MINT', finish: 'HOLO', quantity: 1 },
  { key: 'misty-fire-energy', username: 'misty', cardId: 'base1-98', condition: 'NEAR_MINT', finish: 'NORMAL', quantity: 10 },
  { key: 'misty-pikachu-151', username: 'misty', cardId: 'sv03.5-025', condition: 'NEAR_MINT', finish: 'NORMAL', quantity: 4 },
  { key: 'misty-squirtle-151', username: 'misty', cardId: 'sv03.5-007', condition: 'NEAR_MINT', finish: 'REVERSE', quantity: 2 },
  { key: 'misty-psyduck-151', username: 'misty', cardId: 'sv03.5-054', condition: 'NEAR_MINT', finish: 'NORMAL', quantity: 3 },
  { key: 'misty-gyarados-151', username: 'misty', cardId: 'sv03.5-130', condition: 'EXCELLENT', finish: 'HOLO', quantity: 1 },
  { key: 'misty-magikarp-151', username: 'misty', cardId: 'sv03.5-129', condition: 'GOOD', finish: 'NORMAL', quantity: 6 },
  { key: 'misty-water-energy', username: 'misty', cardId: 'base1-102', condition: 'NEAR_MINT', finish: 'NORMAL', quantity: 8, isPublic: false },
  { key: 'misty-water-energy-sv', username: 'misty', cardId: 'sv02-279', condition: 'MINT', finish: 'HOLO', quantity: 1 },
  { key: 'misty-greninja-ex', username: 'misty', cardId: 'sv06-106', condition: 'NEAR_MINT', finish: 'HOLO', quantity: 1 },
  { key: 'misty-squirtle-base', username: 'misty', cardId: 'base1-63', condition: 'GOOD', finish: 'NORMAL', firstEdition: true, quantity: 1, isPublic: false },

  { key: 'brock-dialga', username: 'brock', cardId: 'dp1-1', condition: 'NEAR_MINT', finish: 'HOLO', quantity: 1 },
  { key: 'brock-lucario', username: 'brock', cardId: 'dp1-6', condition: 'NEAR_MINT', finish: 'REVERSE', quantity: 2 },
  { key: 'brock-palkia', username: 'brock', cardId: 'dp1-11', condition: 'EXCELLENT', finish: 'HOLO', quantity: 1 },
  { key: 'brock-garchomp-ex', username: 'brock', cardId: 'sv04-038', condition: 'NEAR_MINT', finish: 'HOLO', quantity: 2 },
  { key: 'brock-snorlax-151', username: 'brock', cardId: 'sv03.5-143', condition: 'NEAR_MINT', finish: 'NORMAL', quantity: 3 },
  { key: 'brock-snorlax-vmax', username: 'brock', cardId: 'swsh1-142', condition: 'NEAR_MINT', finish: 'HOLO', quantity: 1 },
  { key: 'brock-professor-oak', username: 'brock', cardId: 'base1-88', condition: 'GOOD', finish: 'NORMAL', quantity: 2 },
  { key: 'brock-bill', username: 'brock', cardId: 'base1-91', condition: 'PLAYED', finish: 'NORMAL', quantity: 4, isPublic: false },
  { key: 'brock-rare-candy', username: 'brock', cardId: 'sm1-129', condition: 'NEAR_MINT', finish: 'NORMAL', quantity: 4 },
  { key: 'brock-nest-ball', username: 'brock', cardId: 'sv01-181', condition: 'NEAR_MINT', finish: 'NORMAL', quantity: 4 },
  { key: 'brock-boss-orders', username: 'brock', cardId: 'sv02-172', condition: 'NEAR_MINT', finish: 'REVERSE', quantity: 1 },
  { key: 'brock-iono', username: 'brock', cardId: 'sv02-185', condition: 'NEAR_MINT', finish: 'NORMAL', quantity: 2 },
  { key: 'brock-psyduck-151', username: 'brock', cardId: 'sv03.5-054', condition: 'NEAR_MINT', finish: 'REVERSE', quantity: 1 },
  { key: 'brock-double-colorless', username: 'brock', cardId: 'base1-96', condition: 'EXCELLENT', finish: 'NORMAL', quantity: 3 },
  { key: 'brock-eevee-jungle', username: 'brock', cardId: 'base2-51', condition: 'GOOD', finish: 'NORMAL', firstEdition: true, quantity: 1, isPublic: false },

  { key: 'gary-charizard-sir', username: 'gary', cardId: 'sv03.5-199', condition: 'NEAR_MINT', finish: 'HOLO', quantity: 1 },
  { key: 'gary-charizard-ex-151', username: 'gary', cardId: 'sv03.5-006', condition: 'NEAR_MINT', finish: 'HOLO', quantity: 2 },
  { key: 'gary-charizard-ex-of', username: 'gary', cardId: 'sv03-125', condition: 'MINT', finish: 'HOLO', quantity: 1 },
  { key: 'gary-charizard-swsh', username: 'gary', cardId: 'swsh4-25', condition: 'NEAR_MINT', finish: 'NORMAL', quantity: 2 },
  { key: 'gary-charizard-swsh-holo', username: 'gary', cardId: 'swsh4-25', condition: 'NEAR_MINT', finish: 'HOLO', quantity: 1 },
  { key: 'gary-charizard-vstar', username: 'gary', cardId: 'swsh9-018', condition: 'NEAR_MINT', finish: 'HOLO', quantity: 1 },
  { key: 'gary-radiant-charizard', username: 'gary', cardId: 'swsh12.5-020', condition: 'NEAR_MINT', finish: 'HOLO', quantity: 1 },
  { key: 'gary-eevee-151', username: 'gary', cardId: 'sv03.5-133', condition: 'NEAR_MINT', finish: 'NORMAL', quantity: 4 },
  { key: 'gary-eevee-151-reverse', username: 'gary', cardId: 'sv03.5-133', condition: 'NEAR_MINT', finish: 'REVERSE', quantity: 2 },
  { key: 'gary-umbreon', username: 'gary', cardId: 'sv03-130', condition: 'NEAR_MINT', finish: 'REVERSE', quantity: 1 },
  { key: 'gary-fire-energy', username: 'gary', cardId: 'sv03-230', condition: 'NEAR_MINT', finish: 'HOLO', quantity: 2 },
  { key: 'gary-boss-orders', username: 'gary', cardId: 'swsh9-132', condition: 'NEAR_MINT', finish: 'HOLO', quantity: 2 },
  { key: 'gary-charmander-151', username: 'gary', cardId: 'sv03.5-004', condition: 'NEAR_MINT', finish: 'HOLO', quantity: 1 },
  { key: 'gary-charmander-151-normal', username: 'gary', cardId: 'sv03.5-004', condition: 'NEAR_MINT', finish: 'NORMAL', quantity: 3 },
  { key: 'gary-arven', username: 'gary', cardId: 'sv01-166', condition: 'NEAR_MINT', finish: 'NORMAL', quantity: 2, isPublic: false },
  { key: 'gary-mewtwo-base', username: 'gary', cardId: 'base1-10', condition: 'EXCELLENT', finish: 'HOLO', quantity: 1 },
  { key: 'gary-koraidon-ex', username: 'gary', cardId: 'sv01-125', condition: 'NEAR_MINT', finish: 'HOLO', quantity: 1 },

  { key: 'erika-venusaur', username: 'erika', cardId: 'base1-15', condition: 'NEAR_MINT', finish: 'HOLO', quantity: 1 },
  { key: 'erika-bulbasaur-base', username: 'erika', cardId: 'base1-44', condition: 'GOOD', finish: 'NORMAL', firstEdition: true, quantity: 1 },
  { key: 'erika-bulbasaur-151', username: 'erika', cardId: 'sv03.5-001', condition: 'NEAR_MINT', finish: 'NORMAL', quantity: 3 },
  { key: 'erika-bulbasaur-151-reverse', username: 'erika', cardId: 'sv03.5-001', condition: 'MINT', finish: 'REVERSE', quantity: 1 },
  { key: 'erika-celebi-v', username: 'erika', cardId: 'swsh1-1', condition: 'NEAR_MINT', finish: 'HOLO', quantity: 1 },
  { key: 'erika-sylveon-vmax', username: 'erika', cardId: 'swsh7-75', condition: 'NEAR_MINT', finish: 'HOLO', quantity: 1 },
  { key: 'erika-sylveon-ex', username: 'erika', cardId: 'sv08-086', condition: 'NEAR_MINT', finish: 'HOLO', quantity: 2 },
  { key: 'erika-xerneas-ex', username: 'erika', cardId: 'xy1-97', condition: 'EXCELLENT', finish: 'NORMAL', quantity: 1 },
  { key: 'erika-fairy-energy', username: 'erika', cardId: 'xy1-140', condition: 'NEAR_MINT', finish: 'NORMAL', quantity: 6 },
  { key: 'erika-rowlet', username: 'erika', cardId: 'sm1-9', condition: 'MINT', finish: 'NORMAL', quantity: 2 },
  { key: 'erika-eevee-evs', username: 'erika', cardId: 'swsh7-125', condition: 'NEAR_MINT', finish: 'REVERSE', quantity: 2 },
  { key: 'erika-espeon-gx', username: 'erika', cardId: 'sm1-61', condition: 'NEAR_MINT', finish: 'NORMAL', quantity: 1 },
  { key: 'erika-professor-research', username: 'erika', cardId: 'swsh1-178', condition: 'NEAR_MINT', finish: 'HOLO', quantity: 1, isPublic: false },
  { key: 'erika-nest-ball', username: 'erika', cardId: 'sv01-181', condition: 'NEAR_MINT', finish: 'REVERSE', quantity: 2 },

  { key: 'dawn-umbreon-gx', username: 'dawn', cardId: 'sm1-80', condition: 'NEAR_MINT', finish: 'NORMAL', quantity: 1, isPublic: false },
  { key: 'dawn-eevee-151', username: 'dawn', cardId: 'sv03.5-133', condition: 'MINT', finish: 'NORMAL', quantity: 2, isPublic: false },
  { key: 'dawn-pikachu-151-reverse', username: 'dawn', cardId: 'sv03.5-025', condition: 'NEAR_MINT', finish: 'REVERSE', quantity: 1, isPublic: false },
  { key: 'dawn-mew-v', username: 'dawn', cardId: 'swsh12.5-060', condition: 'NEAR_MINT', finish: 'HOLO', quantity: 1, isPublic: false },
  { key: 'dawn-pikachu-ex', username: 'dawn', cardId: 'sv02-063', condition: 'NEAR_MINT', finish: 'HOLO', quantity: 1, isPublic: false },
  { key: 'dawn-psychic-energy', username: 'dawn', cardId: 'sv03.5-207', condition: 'NEAR_MINT', finish: 'HOLO', quantity: 2, isPublic: false },
  { key: 'dawn-iono', username: 'dawn', cardId: 'sv02-185', condition: 'MINT', finish: 'REVERSE', quantity: 1, isPublic: false },
  { key: 'dawn-gengar-151', username: 'dawn', cardId: 'sv03.5-094', condition: 'NEAR_MINT', finish: 'REVERSE', quantity: 1, isPublic: false },
  { key: 'dawn-pikachu-secret', username: 'dawn', cardId: 'swsh12.5-160', condition: 'NEAR_MINT', finish: 'HOLO', quantity: 1, isPublic: false },
  { key: 'dawn-magikarp-151', username: 'dawn', cardId: 'sv03.5-129', condition: 'NEAR_MINT', finish: 'REVERSE', quantity: 2, isPublic: false },

  { key: 'cynthia-garchomp-ex', username: 'cynthia', cardId: 'sv04-038', condition: 'MINT', finish: 'HOLO', quantity: 1 },
  { key: 'cynthia-umbreon-vmax', username: 'cynthia', cardId: 'swsh7-215', condition: 'NEAR_MINT', finish: 'HOLO', quantity: 1 },
  { key: 'cynthia-rayquaza-vmax', username: 'cynthia', cardId: 'swsh7-111', condition: 'NEAR_MINT', finish: 'HOLO', quantity: 1 },
  { key: 'cynthia-arceus-vstar', username: 'cynthia', cardId: 'swsh9-123', condition: 'NEAR_MINT', finish: 'HOLO', quantity: 2 },
  { key: 'cynthia-lugia', username: 'cynthia', cardId: 'neo1-9', condition: 'EXCELLENT', finish: 'HOLO', firstEdition: true, quantity: 1 },
  { key: 'cynthia-typhlosion', username: 'cynthia', cardId: 'neo1-17', condition: 'NEAR_MINT', finish: 'HOLO', quantity: 1 },
  { key: 'cynthia-professor-elm', username: 'cynthia', cardId: 'neo1-96', condition: 'GOOD', finish: 'NORMAL', firstEdition: true, quantity: 2 },
  { key: 'cynthia-mewtwo-ex', username: 'cynthia', cardId: 'ex1-101', condition: 'NEAR_MINT', finish: 'HOLO', quantity: 1, isPublic: false },
  { key: 'cynthia-dragonite', username: 'cynthia', cardId: 'base3-4', condition: 'NEAR_MINT', finish: 'HOLO', firstEdition: true, quantity: 1 },
  { key: 'cynthia-gengar', username: 'cynthia', cardId: 'base3-5', condition: 'EXCELLENT', finish: 'HOLO', quantity: 1 },
  { key: 'cynthia-mew-gold', username: 'cynthia', cardId: 'sv03.5-205', condition: 'MINT', finish: 'HOLO', quantity: 1 },
  { key: 'cynthia-pikachu-ir', username: 'cynthia', cardId: 'sv03.5-173', condition: 'NEAR_MINT', finish: 'HOLO', quantity: 2 },
  { key: 'cynthia-charizard-ex-151', username: 'cynthia', cardId: 'sv03.5-006', condition: 'NEAR_MINT', finish: 'HOLO', quantity: 1 },
  { key: 'cynthia-sylveon-ex', username: 'cynthia', cardId: 'sv08-086', condition: 'NEAR_MINT', finish: 'HOLO', quantity: 1 },
  { key: 'cynthia-miraidon-ex', username: 'cynthia', cardId: 'sv01-081', condition: 'NEAR_MINT', finish: 'HOLO', quantity: 1 },
  { key: 'cynthia-legacy-energy', username: 'cynthia', cardId: 'sv06-167', condition: 'NEAR_MINT', finish: 'HOLO', quantity: 1 },
  { key: 'cynthia-turo', username: 'cynthia', cardId: 'sv04-171', condition: 'NEAR_MINT', finish: 'REVERSE', quantity: 2 },
  { key: 'cynthia-mewtwo-151', username: 'cynthia', cardId: 'sv03.5-150', condition: 'NEAR_MINT', finish: 'REVERSE', quantity: 1 },
  { key: 'cynthia-double-turbo', username: 'cynthia', cardId: 'swsh9-151', condition: 'NEAR_MINT', finish: 'NORMAL', quantity: 4 },
  { key: 'cynthia-espeon-gx', username: 'cynthia', cardId: 'sm1-61', condition: 'NEAR_MINT', finish: 'NORMAL', quantity: 1, isPublic: false },

  { key: 'lance-dragonite', username: 'lance', cardId: 'base3-4', condition: 'NEAR_MINT', finish: 'HOLO', quantity: 1 },
  { key: 'lance-gyarados-151', username: 'lance', cardId: 'sv03.5-130', condition: 'NEAR_MINT', finish: 'HOLO', quantity: 2 },
  { key: 'lance-mewtwo-151', username: 'lance', cardId: 'sv03.5-150', condition: 'NEAR_MINT', finish: 'HOLO', quantity: 1 },
  { key: 'lance-zapdos', username: 'lance', cardId: 'base1-16', condition: 'GOOD', finish: 'HOLO', quantity: 1 },
  { key: 'lance-magikarp-151', username: 'lance', cardId: 'sv03.5-129', condition: 'NEAR_MINT', finish: 'NORMAL', quantity: 5 },
  { key: 'lance-charizard-ex-of', username: 'lance', cardId: 'sv03-125', condition: 'NEAR_MINT', finish: 'HOLO', quantity: 1 },
  { key: 'lance-rayquaza-vmax', username: 'lance', cardId: 'swsh7-111', condition: 'EXCELLENT', finish: 'HOLO', quantity: 1 },
  { key: 'lance-dialga', username: 'lance', cardId: 'dp1-1', condition: 'NEAR_MINT', finish: 'REVERSE', quantity: 1 },
  { key: 'lance-gengar-151', username: 'lance', cardId: 'sv03.5-094', condition: 'NEAR_MINT', finish: 'HOLO', quantity: 1 },
  { key: 'lance-double-colorless', username: 'lance', cardId: 'base1-96', condition: 'NEAR_MINT', finish: 'NORMAL', quantity: 2 },
];

const wishlist: SeedWishlistItem[] = [
  { username: 'ash', cardId: 'base1-2' },
  { username: 'ash', cardId: 'sv03.5-006' },
  { username: 'ash', cardId: 'sv03.5-199' },
  { username: 'ash', cardId: 'base1-16' },
  { username: 'misty', cardId: 'base1-4' },
  { username: 'misty', cardId: 'sv01-001' },
  { username: 'misty', cardId: 'swsh7-75' },
  { username: 'misty', cardId: 'sv08-086' },
  { username: 'brock', cardId: 'swsh7-215' },
  { username: 'brock', cardId: 'sv04.5-054' },
  { username: 'brock', cardId: 'xy1-97' },
  { username: 'brock', cardId: 'base3-4' },
  { username: 'gary', cardId: 'base1-4' },
  { username: 'gary', cardId: 'sv03.5-150' },
  { username: 'gary', cardId: 'swsh7-111' },
  { username: 'gary', cardId: 'sv03.5-205' },
  { username: 'erika', cardId: 'sm1-80' },
  { username: 'erika', cardId: 'swsh7-215' },
  { username: 'erika', cardId: 'sv03.5-173' },
  { username: 'erika', cardId: 'base3-5' },
  { username: 'dawn', cardId: 'sv03.5-151' },
  { username: 'dawn', cardId: 'swsh7-75' },
  { username: 'dawn', cardId: 'sm1-61' },
  { username: 'cynthia', cardId: 'base1-2' },
  { username: 'cynthia', cardId: 'sv03.5-199' },
  { username: 'cynthia', cardId: 'base1-16' },
  { username: 'cynthia', cardId: 'swsh4-44' },
  { username: 'lance', cardId: 'swsh7-215' },
  { username: 'lance', cardId: 'neo1-9' },
  { username: 'lance', cardId: 'sv03.5-199' },
];

const listings: SeedListing[] = [
  { item: 'ash-charizard', quantity: 1, description: 'Charizard Base Set 1ª edição, sem marcas na frente.', daysAgo: 12 },
  { item: 'ash-pikachu-vmax', quantity: 1, description: 'Pikachu VMAX de Vivid Voltage, saiu do booster direto para o sleeve.', daysAgo: 3 },
  { item: 'misty-blastoise', quantity: 1, description: 'Troco por Charizard ou cartas da 151.', daysAgo: 11 },
  { item: 'misty-gyarados-151', quantity: 1, description: 'Gyarados holo da 151. Procuro cartas de água.', daysAgo: 6 },
  { item: 'misty-greninja-ex', quantity: 1, description: 'Greninja ex, pausado enquanto decido.', daysAgo: 20, status: 'PAUSED' },
  { item: 'brock-palkia', quantity: 1, description: 'Palkia holo de Diamond & Pearl, cantos levemente gastos.', daysAgo: 25 },
  { item: 'brock-garchomp-ex', quantity: 1, description: 'Garchomp ex de Paradox Rift. Tenho duas, troco uma.', daysAgo: 9 },
  { item: 'brock-snorlax-vmax', quantity: 1, description: 'Snorlax VMAX gigante, ótimo para coleção.', daysAgo: 15 },
  { item: 'brock-iono', quantity: 2, description: 'Duas Iono para quem monta deck competitivo.', daysAgo: 1 },
  { item: 'brock-double-colorless', quantity: 1, description: 'Double Colorless Energy do Base Set.', daysAgo: 40, status: 'CLOSED' },
  { item: 'brock-lucario', quantity: 1, description: 'Lucario reverse de Diamond & Pearl.', daysAgo: 30 },
  { item: 'gary-charizard-sir', quantity: 1, description: 'Charizard ex Special Illustration Rare da 151. Só troco por carta à altura.', daysAgo: 2 },
  { item: 'gary-charizard-ex-151', quantity: 1, description: 'Charizard ex da 151, tenho repetido.', daysAgo: 8 },
  { item: 'gary-radiant-charizard', quantity: 1, description: 'Radiant Charizard de Crown Zenith.', daysAgo: 17 },
  { item: 'gary-mewtwo-base', quantity: 1, description: 'Mewtwo holo do Base Set, excelente estado.', daysAgo: 22 },
  { item: 'gary-charizard-vstar', quantity: 1, description: 'Charizard VSTAR, chama no WhatsApp para fechar fora do site.', daysAgo: 5, status: 'BLOCKED' },
  { item: 'erika-venusaur', quantity: 1, description: 'Venusaur holo do Base Set.', daysAgo: 14 },
  { item: 'erika-celebi-v', quantity: 1, description: 'Celebi V de Sword & Shield.', daysAgo: 7 },
  { item: 'erika-sylveon-vmax', quantity: 1, description: 'Sylveon VMAX de Evolving Skies, sem riscos.', daysAgo: 4 },
  { item: 'erika-nest-ball', quantity: 1, description: 'Nest Ball reverse.', daysAgo: 18, status: 'PAUSED' },
  { item: 'cynthia-umbreon-vmax', quantity: 1, description: 'Umbreon VMAX alt art (Moonbreon). Só troca grande.', daysAgo: 1 },
  { item: 'cynthia-rayquaza-vmax', quantity: 1, description: 'Rayquaza VMAX de Evolving Skies.', daysAgo: 10 },
  { item: 'cynthia-lugia', quantity: 1, description: 'Lugia Neo Genesis 1ª edição.', daysAgo: 27 },
  { item: 'cynthia-gengar', quantity: 1, description: 'Gengar holo de Fossil.', daysAgo: 19 },
  { item: 'cynthia-mew-gold', quantity: 1, description: 'Mew ex dourado da 151.', daysAgo: 5 },
  { item: 'cynthia-pikachu-ir', quantity: 1, description: 'Pikachu Illustration Rare da 151.', daysAgo: 13 },
  { item: 'cynthia-dragonite', quantity: 1, description: 'Dragonite Fossil 1ª edição.', daysAgo: 35, status: 'CLOSED' },
  { item: 'cynthia-arceus-vstar', quantity: 1, description: 'Arceus VSTAR de Brilliant Stars.', daysAgo: 28 },
  { item: 'cynthia-double-turbo', quantity: 2, description: 'Double Turbo Energy, duas unidades.', daysAgo: 16 },
  { item: 'lance-dragonite', quantity: 1, description: 'Dragonite holo de Fossil.', daysAgo: 45 },
];

const offers: SeedOffer[] = [
  {
    listing: 'ash-charizard',
    proposer: 'misty',
    quantity: 1,
    message: 'Troco meu Mew holo pelo seu Charizard?',
    items: [{ item: 'misty-mew', quantity: 1 }],
    status: 'PROPOSED',
  },
  {
    listing: 'ash-charizard',
    proposer: 'gary',
    quantity: 1,
    message: 'Charizard por Charizard: o meu ex de Obsidian Flames pelo seu de 1999.',
    items: [{ item: 'gary-charizard-ex-of', quantity: 1 }],
    status: 'PROPOSED',
  },
  {
    listing: 'gary-charizard-sir',
    proposer: 'ash',
    quantity: 1,
    message: 'Dois dos meus melhores pelo seu Charizard.',
    items: [
      { item: 'ash-pikachu-ex', quantity: 1 },
      { item: 'ash-greninja', quantity: 1 },
    ],
    status: 'PROPOSED',
  },
  {
    listing: 'cynthia-mew-gold',
    proposer: 'erika',
    quantity: 1,
    message: 'Xerneas EX pelo Mew dourado?',
    items: [{ item: 'erika-xerneas-ex', quantity: 1 }],
    status: 'PROPOSED',
  },
  {
    listing: 'cynthia-umbreon-vmax',
    proposer: 'dawn',
    quantity: 1,
    message: 'Umbreon GX e Pikachu secreto pela Moonbreon.',
    items: [
      { item: 'dawn-umbreon-gx', quantity: 1 },
      { item: 'dawn-pikachu-secret', quantity: 1 },
    ],
    status: 'PROPOSED',
  },
  {
    listing: 'erika-venusaur',
    proposer: 'brock',
    quantity: 1,
    message: 'Meu Dialga holo pelo seu Venusaur.',
    items: [{ item: 'brock-dialga', quantity: 1 }],
    status: 'ACCEPTED',
  },
  {
    listing: 'gary-mewtwo-base',
    proposer: 'cynthia',
    quantity: 1,
    message: 'Typhlosion holo pelo Mewtwo?',
    items: [{ item: 'cynthia-typhlosion', quantity: 1 }],
    status: 'REJECTED',
  },
  {
    listing: 'brock-snorlax-vmax',
    proposer: 'ash',
    quantity: 1,
    message: 'Dois Charmander do Base Set pelo Snorlax.',
    items: [{ item: 'ash-charmander-base', quantity: 2 }],
    status: 'REJECTED',
  },
  {
    listing: 'erika-sylveon-vmax',
    proposer: 'dawn',
    quantity: 1,
    message: 'Mew V pela Sylveon.',
    items: [{ item: 'dawn-mew-v', quantity: 1 }],
    status: 'CANCELED',
  },
  {
    listing: 'brock-iono',
    proposer: 'misty',
    quantity: 1,
    message: 'Um Psyduck pela Iono.',
    items: [{ item: 'misty-psyduck-151', quantity: 1 }],
    status: 'CANCELED',
  },
  {
    listing: 'brock-lucario',
    proposer: 'erika',
    quantity: 1,
    message: 'Rowlet e Eevee pelo Lucario.',
    items: [
      { item: 'erika-rowlet', quantity: 1 },
      { item: 'erika-eevee-evs', quantity: 1 },
    ],
    status: 'ACCEPTED',
    trade: 'ACCEPTED',
  },
  {
    listing: 'cynthia-arceus-vstar',
    proposer: 'gary',
    quantity: 1,
    message: "Boss's Orders e uma Fire Energy pelo Arceus.",
    items: [
      { item: 'gary-boss-orders', quantity: 1 },
      { item: 'gary-fire-energy', quantity: 1 },
    ],
    status: 'ACCEPTED',
    trade: 'ACCEPTED',
  },
  {
    listing: 'cynthia-double-turbo',
    proposer: 'brock',
    quantity: 2,
    message: 'Duas Rare Candy pelas duas Double Turbo.',
    items: [{ item: 'brock-rare-candy', quantity: 2 }],
    status: 'ACCEPTED',
    trade: 'PROPOSED',
  },
];

const offerRepository = new PrismaOfferRepository(prisma);
const listingRepository = new PrismaListingRepository(prisma);
const collectionRepository = new PrismaCollectionRepository(prisma);
const unitOfWork = new PrismaUnitOfWorkFactory(new PrismaTransactionRunner(prisma));

const listingService = new ListingService({
  listings: listingRepository,
  collection: collectionRepository,
  transactions: new PrismaTransactionRunner(prisma),
  changes: new ListingChangeApplier(listingRepository, offerRepository),
});
const offerService = new OfferService({ listings: listingRepository, offers: offerRepository, unitOfWork });
const tradeService = new TradeService({
  offers: offerRepository,
  trades: new PrismaTradeRepository(prisma),
  collection: collectionRepository,
  unitOfWork,
});

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * ONE_DAY);
}

async function loadCards(): Promise<SeedCard[]> {
  const file = await readFile(new URL('./seed-data/cards.json', import.meta.url), 'utf8');
  return JSON.parse(file);
}

function validateSeedData(cards: SeedCard[]) {
  const cardsById = new Map(cards.map((card) => [card.id, card]));
  const owned = new Set<string>();

  for (const { key, username, cardId, finish, firstEdition = false } of collection) {
    const card = cardsById.get(cardId);
    if (!card) throw new Error(`Item ${key}: carta ${cardId} não está em seed-data/cards.json`);
    try {
      assertVariant(card.variants, finish, firstEdition);
    } catch (error) {
      throw new Error(`Item ${key}: ${error instanceof Error ? error.message : String(error)}`);
    }
    owned.add(`${username}:${cardId}`);
  }

  for (const { username, cardId } of wishlist) {
    if (!cardsById.has(cardId)) throw new Error(`Wishlist de ${username}: carta ${cardId} não está em seed-data/cards.json`);
    if (owned.has(`${username}:${cardId}`)) throw new Error(`Wishlist de ${username}: ${cardId} já está na coleção (RN-12)`);
  }
}

async function seedUsers() {
  const adminHash = await bcrypt.hash(env.SEED_ADMIN_PASSWORD, SALT_ROUNDS);
  const demoHash = await bcrypt.hash(env.SEED_DEMO_PASSWORD, SALT_ROUNDS);
  const byUsername: UsersByUsername = {};

  for (const { accountStatus = 'ACTIVE', city = null, state = null, ...user } of users) {
    const passwordHash = user.role === 'ADMIN' ? adminHash : demoHash;
    const existing = await prisma.user.findUnique({ where: { username: user.username }, select: { deletedAt: true } });
    const deletedAt = accountStatus === 'ACTIVE' ? null : (existing?.deletedAt ?? new Date());
    const profile = { name: user.name, city, state, accountStatus, deletedAt };

    byUsername[user.username] = await prisma.user.upsert({
      where: { username: user.username },
      update: { passwordHash, ...profile },
      create: { ...user, ...profile, passwordHash, emailVerified: true },
    });
  }

  return byUsername;
}

async function seedCards(cards: SeedCard[]) {
  for (const { variants, releaseDate, marketPriceUpdatedAt, ...card } of cards) {
    const data = {
      ...card,
      releaseDate: releaseDate ? new Date(releaseDate) : null,
      marketPriceUpdatedAt: marketPriceUpdatedAt ? new Date(marketPriceUpdatedAt) : null,
    };
    await prisma.card.upsert({ where: { id: card.id }, update: data, create: data });
  }
}

async function seedCollection(byUsername: UsersByUsername) {
  const items: ItemsByKey = {};

  for (const { key, username, cardId, condition, finish, firstEdition = false, quantity, isPublic = true } of collection) {
    const userId = byUsername[username].id;
    items[key] = await prisma.collectionItem.upsert({
      where: { userId_cardId_condition_finish_firstEdition: { userId, cardId, condition, finish, firstEdition } },
      update: {},
      create: { userId, cardId, condition, finish, firstEdition, quantity, isPublic },
    });
  }

  return items;
}

async function removeRetiredItems(byUsername: UsersByUsername) {
  for (const { username, cardId } of RETIRED_ITEMS) {
    const retired = await prisma.collectionItem.findMany({
      where: { userId: byUsername[username].id, cardId },
      include: { _count: { select: { listings: true, offerItems: true } } },
    });

    for (const item of retired) {
      if (item.reservedQuantity > 0 || item._count.listings > 0 || item._count.offerItems > 0) {
        console.log(
          `O item ${cardId} de ${username} saiu do seed, mas está num anúncio, oferta ou troca e foi mantido. Para apagar: encerre o que o usa e rode o seed de novo`,
        );
        continue;
      }
      await prisma.collectionItem.delete({ where: { id: item.id } });
    }
  }
}

async function seedWishlist(byUsername: UsersByUsername) {
  for (const { username, cardId } of wishlist) {
    const userId = byUsername[username].id;
    await prisma.wishlistItem.upsert({
      where: { userId_cardId: { userId, cardId } },
      update: {},
      create: { userId, cardId },
    });
  }
}

function ownerOf(items: ItemsByKey, byUsername: UsersByUsername, key: string): User {
  const owner = Object.values(byUsername).find((user) => user.id === items[key].userId);
  if (!owner) throw new Error(`Dono do item ${key} não encontrado`);
  return owner;
}

async function seedListings(byUsername: UsersByUsername, items: ItemsByKey) {
  const byItem: ListingsByItem = {};

  for (const { item, quantity, description, daysAgo: age, status } of listings) {
    const collectionItemId = items[item].id;
    const existing = await prisma.listing.findFirst({ where: { collectionItemId }, orderBy: { createdAt: 'asc' } });
    if (existing) {
      byItem[item] = existing;
      continue;
    }

    const owner = ownerOf(items, byUsername, item);
    const created = await listingService.create(owner.id, { collectionItemId, quantity, description });
    await prisma.listing.update({ where: { id: created.id }, data: { createdAt: daysAgo(age) } });

    if (status) {
      const actor = status === 'BLOCKED' ? byUsername.admin : owner;
      await listingService.update(actor, created.id, { status });
    }

    byItem[item] = await prisma.listing.findUniqueOrThrow({ where: { id: created.id } });
  }

  return byItem;
}

function offerLabel(offer: SeedOffer): string {
  return `oferta de ${offer.proposer} no anúncio ${offer.listing}`;
}

async function reopenOffer(offerId: string, offer: SeedOffer, listing: Listing, items: ItemsByKey) {
  const seedListing = listings.find((entry) => entry.item === offer.listing);
  await prisma.listing.update({
    where: { id: listing.id },
    data: { status: 'ACTIVE', quantity: seedListing?.quantity ?? listing.quantity },
  });
  await prisma.offer.update({
    where: { id: offerId },
    data: { status: 'PROPOSED', respondedAt: null, message: offer.message, quantity: offer.quantity },
  });

  for (const { item, quantity } of offer.items) {
    const collectionItemId = items[item].id;
    await prisma.offerItem.upsert({
      where: { offerId_collectionItemId: { offerId, collectionItemId } },
      update: { quantity },
      create: { offerId, collectionItemId, quantity },
    });
  }
}

async function createOffer(offer: SeedOffer, proposer: User, owner: User, listing: Listing, items: ItemsByKey) {
  const created = await offerService.create(proposer, listing.id, {
    quantity: offer.quantity,
    message: offer.message,
    items: offer.items.map(({ item, quantity }) => ({ collectionItemId: items[item].id, quantity })),
  });

  if (offer.status === 'ACCEPTED' || offer.status === 'REJECTED') {
    await offerService.changeStatus(owner.id, created.id, offer.status);
  } else if (offer.status === 'CANCELED') {
    await offerService.changeStatus(proposer.id, created.id, offer.status);
  }

  return { id: created.id, status: offer.status };
}

async function seedOffer(offer: SeedOffer, byUsername: UsersByUsername, items: ItemsByKey, byItem: ListingsByItem) {
  const proposer = byUsername[offer.proposer];
  const owner = ownerOf(items, byUsername, offer.listing);
  const listing = byItem[offer.listing];

  const existing = await prisma.offer.findFirst({
    where: { listingId: listing.id, proposerId: proposer.id },
    include: { trade: { select: { id: true, status: true } } },
    orderBy: { createdAt: 'asc' },
  });

  if (existing && !offer.trade) {
    if (offer.status !== 'PROPOSED') return;
    if (existing.trade) {
      console.log(
        `A ${offerLabel(offer)} já virou troca. Para voltar ao estado inicial: npx prisma migrate reset (apaga o banco local)`,
      );
      return;
    }
    await reopenOffer(existing.id, offer, listing, items);
    return;
  }

  const current = existing ?? (await createOffer(offer, proposer, owner, listing, items));
  if (!offer.trade) return;

  let trade = existing?.trade ?? null;
  if (!trade) {
    if (current.status !== 'ACCEPTED') {
      console.log(`A ${offerLabel(offer)} não está mais aceita (${current.status}); a troca dela não foi criada`);
      return;
    }
    trade = await tradeService.create(proposer.id, current.id);
  }

  if (offer.trade === 'ACCEPTED' && trade.status === 'PROPOSED') {
    await tradeService.accept(owner.id, trade.id);
  }
}

async function seedOffers(byUsername: UsersByUsername, items: ItemsByKey, byItem: ListingsByItem) {
  for (const offer of offers) {
    await seedOffer(offer, byUsername, items, byItem);
  }
}

async function main() {
  const cards = await loadCards();
  validateSeedData(cards);

  const byUsername = await seedUsers();
  await seedCards(cards);
  const items = await seedCollection(byUsername);
  await removeRetiredItems(byUsername);
  await seedWishlist(byUsername);
  const byItem = await seedListings(byUsername, items);
  await seedOffers(byUsername, items, byItem);

  console.log(
    `Seed ok. ${cards.length} cartas · ${collection.length} itens de coleção · ${wishlist.length} de wishlist · ${listings.length} anúncios · ${offers.length} ofertas · usuários: ${users.map((user) => user.username).join(', ')} · senhas: SEED_ADMIN_PASSWORD (admin) e SEED_DEMO_PASSWORD (demais)`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
