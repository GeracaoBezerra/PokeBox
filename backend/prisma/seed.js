import '../src/config/env.js';
import { readFile } from 'node:fs/promises';

import bcrypt from 'bcrypt';

import { prisma } from '../src/lib/prisma.js';

const SEED_PASSWORD = 'pokebox123';
const SALT_ROUNDS = 12;

const users = [
  { username: 'admin', name: 'Admin PokeBox', email: 'admin@pokebox.dev', role: 'ADMIN' },
  { username: 'ash', name: 'Ash Ketchum', email: 'ash@pokebox.dev', role: 'USER' },
  { username: 'misty', name: 'Misty Waterflower', email: 'misty@pokebox.dev', role: 'USER' },
];

const collection = [
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

async function loadCards() {
  const file = await readFile(new URL('./seed-data/cards.json', import.meta.url), 'utf8');
  return JSON.parse(file);
}

async function seedUsers() {
  const passwordHash = await bcrypt.hash(SEED_PASSWORD, SALT_ROUNDS);
  const byUsername = {};

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

  for (const { variants, releaseDate, ...card } of cards) {
    const data = { ...card, releaseDate: releaseDate ? new Date(releaseDate) : null };
    await prisma.card.upsert({ where: { id: card.id }, update: data, create: data });
  }

  return cards;
}

async function seedCollection(byUsername) {
  const items = {};

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

async function seedWishlist(byUsername) {
  for (const { username, cardId } of wishlist) {
    const userId = byUsername[username].id;
    await prisma.wishlistItem.upsert({
      where: { userId_cardId: { userId, cardId } },
      update: {},
      create: { userId, cardId },
    });
  }
}

async function findOrCreateListing(data) {
  const existing = await prisma.listing.findFirst({ where: { collectionItemId: data.collectionItemId } });
  return existing ?? prisma.listing.create({ data });
}

async function seedMarketplace(byUsername, items) {
  const charizardListing = await findOrCreateListing({
    collectionItemId: items['ash-charizard'].id,
    type: 'SALE_OR_TRADE',
    quantity: 1,
    priceCents: 150000,
    description: 'Charizard Base Set 1ª edição, sem marcas na frente.',
  });

  await findOrCreateListing({
    collectionItemId: items['misty-blastoise'].id,
    type: 'TRADE',
    quantity: 1,
    description: 'Troco por Charizard ou cartas da 151.',
  });

  const proposerId = byUsername.misty.id;
  const existingOffer = await prisma.offer.findFirst({ where: { listingId: charizardListing.id, proposerId } });

  if (!existingOffer) {
    await prisma.offer.create({
      data: {
        listingId: charizardListing.id,
        proposerId,
        quantity: 1,
        priceCents: 120000,
        message: 'Topa R$ 1.200?',
      },
    });
  }
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
