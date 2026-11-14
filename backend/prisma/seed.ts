import { readFile } from 'node:fs/promises';

import bcrypt from 'bcrypt';

import { loadDatabaseEnv } from '../src/config/env.js';
import type { CardCondition, CardFinish, CollectionItem, Prisma, User, UserRole } from '../src/generated/prisma/index.js';
import { createPrismaClient } from '../src/lib/prisma.js';

const prisma = createPrismaClient(loadDatabaseEnv().DATABASE_URL);

const SEED_PASSWORD = 'pokebox123';
const SALT_ROUNDS = 12;

interface SeedUser {
  username: string;
  name: string;
  email: string;
  role: UserRole;
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

type SeedCard = Omit<Prisma.CardCreateInput, 'releaseDate' | 'marketPriceUpdatedAt'> & {
  variants?: unknown;
  releaseDate?: string | null;
  marketPriceUpdatedAt?: string | null;
};

type UsersByUsername = Record<string, User>;
type ItemsByKey = Record<string, CollectionItem>;

const users: SeedUser[] = [
  { username: 'admin', name: 'Admin PokeBox', email: 'admin@pokebox.dev', role: 'ADMIN' },
  { username: 'ash', name: 'Ash Ketchum', email: 'ash@pokebox.dev', role: 'USER' },
  { username: 'misty', name: 'Misty Waterflower', email: 'misty@pokebox.dev', role: 'USER' },
];

const collection: SeedCollectionItem[] = [
  { key: 'ash-charizard', username: 'ash', cardId: 'base1-4', condition: 'NEAR_MINT', finish: 'HOLO', firstEdition: true, quantity: 1 },
  { key: 'ash-pikachu-base', username: 'ash', cardId: 'base1-58', condition: 'GOOD', finish: 'NORMAL', quantity: 3 },
  { key: 'ash-pikachu-151', username: 'ash', cardId: 'sv03.5-025', condition: 'NEAR_MINT', finish: 'NORMAL', quantity: 2 },
  { key: 'ash-pikachu-151-reverse', username: 'ash', cardId: 'sv03.5-025', condition: 'MINT', finish: 'REVERSE', quantity: 1 },
  { key: 'ash-furret', username: 'ash', cardId: 'swsh3-136', condition: 'MINT', finish: 'REVERSE', quantity: 1, isPublic: false },
  { key: 'ash-ultra-ball', username: 'ash', cardId: 'sv01-196', condition: 'NEAR_MINT', finish: 'NORMAL', quantity: 4 },
  { key: 'misty-blastoise', username: 'misty', cardId: 'base1-2', condition: 'MINT', finish: 'HOLO', quantity: 1 },
  { key: 'misty-mew', username: 'misty', cardId: 'sv03.5-151', condition: 'NEAR_MINT', finish: 'HOLO', quantity: 1 },
  { key: 'misty-fire-energy', username: 'misty', cardId: 'sve-002', condition: 'NEAR_MINT', finish: 'NORMAL', quantity: 10 },
  { key: 'misty-pikachu-151', username: 'misty', cardId: 'sv03.5-025', condition: 'NEAR_MINT', finish: 'NORMAL', quantity: 4 },
];

const wishlist = [
  { username: 'ash', cardId: 'base1-2' },
  { username: 'ash', cardId: 'sv03.5-006' },
  { username: 'misty', cardId: 'base1-4' },
  { username: 'misty', cardId: 'sv01-001' },
];

async function loadCards(): Promise<SeedCard[]> {
  const file = await readFile(new URL('./seed-data/cards.json', import.meta.url), 'utf8');
  return JSON.parse(file);
}

async function seedUsers() {
  const passwordHash = await bcrypt.hash(SEED_PASSWORD, SALT_ROUNDS);
  const byUsername: UsersByUsername = {};

  for (const user of users) {
    byUsername[user.username] = await prisma.user.upsert({
      where: { username: user.username },
      update: {},
      create: { ...user, passwordHash, accountStatus: 'ACTIVE', emailVerified: true },
    });
  }

  return byUsername;
}

async function seedCards() {
  const cards = await loadCards();

  for (const { variants, releaseDate, marketPriceUpdatedAt, ...card } of cards) {
    const data = {
      ...card,
      releaseDate: releaseDate ? new Date(releaseDate) : null,
      marketPriceUpdatedAt: marketPriceUpdatedAt ? new Date(marketPriceUpdatedAt) : null,
    };
    await prisma.card.upsert({ where: { id: card.id }, update: data, create: data });
  }

  return cards;
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

async function findOrCreateListing(data: Prisma.ListingUncheckedCreateInput) {
  const existing = await prisma.listing.findFirst({ where: { collectionItemId: data.collectionItemId } });
  return existing ?? prisma.listing.create({ data });
}

async function seedMarketplace(byUsername: UsersByUsername, items: ItemsByKey) {
  const charizardListing = await findOrCreateListing({
    collectionItemId: items['ash-charizard'].id,
    quantity: 1,
    description: 'Charizard Base Set 1ª edição, sem marcas na frente.',
  });

  await findOrCreateListing({
    collectionItemId: items['misty-blastoise'].id,
    quantity: 1,
    description: 'Troco por Charizard ou cartas da 151.',
  });

  const proposerId = byUsername.misty.id;
  const message = 'Troco meu Mew holo pelo seu Charizard?';
  const existingOffer = await prisma.offer.findFirst({ where: { listingId: charizardListing.id, proposerId } });

  if (existingOffer && (await prisma.trade.findUnique({ where: { offerId: existingOffer.id } }))) {
    console.log(
      'A oferta do seed já virou troca. Para voltar ao estado inicial: npx prisma migrate reset (apaga o banco local)',
    );
    return;
  }

  await prisma.listing.update({ where: { id: charizardListing.id }, data: { status: 'ACTIVE', quantity: 1 } });

  const offer = existingOffer
    ? await prisma.offer.update({
        where: { id: existingOffer.id },
        data: { status: 'PROPOSED', respondedAt: null, message },
      })
    : await prisma.offer.create({ data: { listingId: charizardListing.id, proposerId, quantity: 1, message } });

  const collectionItemId = items['misty-mew'].id;
  await prisma.offerItem.upsert({
    where: { offerId_collectionItemId: { offerId: offer.id, collectionItemId } },
    update: {},
    create: { offerId: offer.id, collectionItemId, quantity: 1 },
  });
}

async function main() {
  const byUsername = await seedUsers();
  const cards = await seedCards();
  const items = await seedCollection(byUsername);
  await seedWishlist(byUsername);
  await seedMarketplace(byUsername, items);

  console.log(`Seed ok. ${cards.length} cartas · usuários: ${users.map((user) => user.username).join(', ')} · senha: ${SEED_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
