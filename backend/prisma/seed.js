import '../src/config/env.js';
import bcrypt from 'bcrypt';

import { prisma } from '../src/lib/prisma.js';

const SEED_PASSWORD = 'pokebox123';
const SALT_ROUNDS = 12;

const users = [
  { username: 'admin', name: 'Admin PokeBox', email: 'admin@pokebox.dev', role: 'ADMIN' },
  { username: 'ash', name: 'Ash Ketchum', email: 'ash@pokebox.dev', role: 'USER' },
  { username: 'misty', name: 'Misty Waterflower', email: 'misty@pokebox.dev', role: 'USER' },
];

const cards = [
  { id: 'base1-4', name: 'Charizard', setId: 'base1', setName: 'Base Set', number: '4', rarity: 'Rare', imageUrl: 'https://assets.tcgdex.net/en/base/base1/4' },
  { id: 'base1-2', name: 'Blastoise', setId: 'base1', setName: 'Base Set', number: '2', rarity: 'Rare', imageUrl: 'https://assets.tcgdex.net/en/base/base1/2' },
  { id: 'base1-58', name: 'Pikachu', setId: 'base1', setName: 'Base Set', number: '58', rarity: 'Common', imageUrl: 'https://assets.tcgdex.net/en/base/base1/58' },
  { id: 'sv03.5-025', name: 'Pikachu', setId: 'sv03.5', setName: '151', number: '025', rarity: 'Common', imageUrl: 'https://assets.tcgdex.net/en/sv/sv03.5/025' },
  { id: 'swsh3-136', name: 'Furret', setId: 'swsh3', setName: 'Darkness Ablaze', number: '136', rarity: 'Uncommon', imageUrl: 'https://assets.tcgdex.net/en/swsh/swsh3/136' },
  { id: 'sv01-001', name: 'Pineco', setId: 'sv01', setName: 'Scarlet & Violet', number: '001', rarity: 'Common', imageUrl: 'https://assets.tcgdex.net/en/sv/sv01/001' },
];

const collection = [
  { username: 'ash', cardId: 'base1-4', condition: 'NEAR_MINT', quantity: 2 },
  { username: 'ash', cardId: 'base1-58', condition: 'GOOD', quantity: 3 },
  { username: 'ash', cardId: 'swsh3-136', condition: 'MINT', quantity: 1, isPublic: false },
  { username: 'misty', cardId: 'base1-2', condition: 'MINT', quantity: 1 },
  { username: 'misty', cardId: 'sv03.5-025', condition: 'NEAR_MINT', quantity: 4 },
];

const wishlist = [
  { username: 'ash', cardId: 'base1-2' },
  { username: 'misty', cardId: 'base1-4' },
  { username: 'misty', cardId: 'sv01-001' },
];

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
  for (const card of cards) {
    await prisma.card.upsert({ where: { id: card.id }, update: card, create: card });
  }
}

async function seedCollection(byUsername) {
  const items = {};

  for (const { username, cardId, condition, quantity, isPublic = true } of collection) {
    const userId = byUsername[username].id;
    items[`${username}:${cardId}`] = await prisma.collectionItem.upsert({
      where: { userId_cardId_condition: { userId, cardId, condition } },
      update: {},
      create: { userId, cardId, condition, quantity, isPublic },
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
    collectionItemId: items['ash:base1-4'].id,
    type: 'SALE_OR_TRADE',
    quantity: 1,
    priceCents: 150000,
    description: 'Charizard Base Set, sem marcas na frente.',
  });

  await findOrCreateListing({
    collectionItemId: items['misty:base1-2'].id,
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
  await seedCards();
  const items = await seedCollection(byUsername);
  await seedWishlist(byUsername);
  await seedMarketplace(byUsername, items);

  console.log(`Seed ok. Usuários: ${users.map((user) => user.username).join(', ')} · senha: ${SEED_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
