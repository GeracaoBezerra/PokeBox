import { prisma } from '../lib/prisma.js';
import { MemoryCache } from '../utils/memoryCache.js';
import { cardMock } from '../mocks/cardMock.js';
import { fetchCardFromTcgdex, searchCardsInTcgdex } from './tcgdexRepository.js';


const ONE_HOUR = 60 * 60 * 1000;
const DB_TTL_MS = 24 * ONE_HOUR;
const memory = new MemoryCache(ONE_HOUR);
const inFlight = new Map(); 
const TEN_MINUTES = 10 * 60 * 1000;
const listMemory = new MemoryCache(TEN_MINUTES);

async function readDbCache(cardId, lang) {
  try {
    return await prisma.cardCache.findUnique({ where: { cardId_lang: { cardId, lang } } });
  } catch (err) {
    console.error('Falha ao ler CardCache:', err.message);
    return null;
  }
}

async function writeDbCache(cardId, lang, data) {
  try {
    await prisma.cardCache.upsert({
      where: { cardId_lang: { cardId, lang } },
      create: { cardId, lang, data },
      update: { data },
    });
  } catch (err) {
    console.error('Falha ao salvar CardCache:', err.message);
  }
}

export async function findCardById(id, lang) {
  if (process.env.USE_MOCK === 'true') return cardMock;

  const key = `${lang}:${id}`;
  const fromMemory = memory.get(key);
  if (fromMemory) return fromMemory;
  if (inFlight.has(key)) return inFlight.get(key);

  const promise = (async () => {
    const cached = await readDbCache(id, lang);
    const isFresh = cached && Date.now() - cached.updatedAt.getTime() < DB_TTL_MS;

    if (cached && isFresh) {
      memory.set(key, cached.data);
      return cached.data;
    }

    try {
      const card = await fetchCardFromTcgdex(id, lang);
      await writeDbCache(id, lang, card);
      memory.set(key, card);
      return card;
    } catch (err) {
      if (cached) return cached.data;
      throw err;
    }
  })();


  inFlight.set(key, promise);
  try {
    return await promise;
  } finally {
    inFlight.delete(key);
  }
}


export async function findCards({ lang, name, page, limit }) {
  if (process.env.USE_MOCK === 'true') {
    const { id, number, name: mockName, image } = cardMock;
    return [{ id, localId: number.split('/')[0], name: mockName, image }];
  }

  const key = `${lang}:${name ?? ''}:${page}:${limit}`;
  const fromMemory = listMemory.get(key);
  if (fromMemory) return fromMemory;

  const cards = await searchCardsInTcgdex({ lang, name, page, limit });
  listMemory.set(key, cards);
  return cards;
}



export async function findUserCardInfo(userId, cardId) {
  return { inCollection: 0, inWishlist: false, onTradeList: false };
}

export async function findListingsByCard(cardId) {
  return [];
}
