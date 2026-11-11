import { prisma } from '../lib/prisma.js';
import { MemoryCache } from '../utils/memoryCache.js';
import { toMarketPriceFields } from '../utils/cardRecord.js';
import { cardMock } from '../mocks/cardMock.js';
import { fetchCardFromTcgdex, listSetCards, listSets, searchCardsInTcgdex } from './tcgdexRepository.js';
import { matchSets, nameMatchesAny, rankCards, toCardListItem, tokenize } from '../utils/cardSearch.js';


const ONE_HOUR = 60 * 60 * 1000;
const DB_TTL_MS = 24 * ONE_HOUR;
const memory = new MemoryCache(ONE_HOUR);
const inFlight = new Map(); 
const TEN_MINUTES = 10 * 60 * 1000;
const listMemory = new MemoryCache(TEN_MINUTES);
const SEARCH_PAGE_SIZE = 250;
const MAX_WORD_SEARCHES = 4;

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

async function refreshStoredPrice(cardId, marketPrice) {
  try {
    await prisma.card.updateMany({
      where: { id: cardId },
      data: toMarketPriceFields(marketPrice),
    });
  } catch (err) {
    console.error('Falha ao atualizar preço da Card:', err.message);
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
      await writeDbCache(card.id, lang, card);
      await refreshStoredPrice(card.id, card.marketPrice);
      memory.set(`${lang}:${card.id}`, card);
      if (card.id !== id) memory.set(key, card);
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
    const { id, number, name: mockName, image, set } = cardMock;
    const localId = number.split('/')[0];
    return {
      cards: [{ id, localId, number: localId, name: mockName, set: { id: set.id, name: set.name }, image }],
      hasNextPage: false,
      search: null,
    };
  }

  const tokens = tokenize(name);
  if (tokens.length === 0) return listAllCards({ lang, page, limit });

  const key = `${lang}:${tokens.join(' ')}`;
  let result = listMemory.get(key);
  if (!result) {
    result = await searchCards(lang, tokens);
    listMemory.set(key, result);
  }

  const start = (page - 1) * limit;
  const end = start + limit;
  return {
    cards: result.cards.slice(start, end),
    hasNextPage: end < result.cards.length,
    search: result.search,
  };
}

async function listAllCards({ lang, page, limit }) {
  const key = `${lang}::${page}:${limit}`;
  const fromMemory = listMemory.get(key);
  if (fromMemory) return fromMemory;

  const [found, sets] = await Promise.all([
    searchCardsInTcgdex({ lang, page, limit }),
    listSets(lang),
  ]);
  const result = {
    cards: found.map((card) => toCardListItem(card, sets)),
    hasNextPage: found.length === limit,
    search: null,
  };
  listMemory.set(key, result);
  return result;
}

async function searchByName(lang, words) {
  return searchCardsInTcgdex({ lang, name: words, page: 1, limit: SEARCH_PAGE_SIZE });
}

async function searchNameTokens(lang, nameTokens) {
  if (nameTokens.length === 0) return { cards: [], ignored: [] };

  const cards = await searchByName(lang, nameTokens.join(' '));
  if (cards.length > 0 || nameTokens.length === 1) {
    return { cards, ignored: cards.length > 0 ? [] : nameTokens };
  }

  const words = [...nameTokens].sort((a, b) => b.length - a.length).slice(0, MAX_WORD_SEARCHES);
  const results = await Promise.all(words.map((word) => searchByName(lang, word)));
  const useful = words.filter((_, index) => results[index].length > 0);
  return {
    cards: results.flat(),
    ignored: nameTokens.filter((token) => !useful.includes(token)),
  };
}

async function searchCards(lang, tokens) {
  const sets = await listSets(lang);
  const matched = matchSets(tokens, sets);
  const nameTokens = tokens.filter((token) => !matched.used.includes(token));
  const setIds = matched.sets.map((set) => set.id);

  const [byName, ...bySet] = await Promise.all([
    searchNameTokens(lang, nameTokens),
    ...setIds.map((setId) => listSetCards(setId, lang)),
  ]);

  const setCards = bySet
    .flat()
    .filter((card) => nameTokens.length === 0 || nameMatchesAny(card.name, nameTokens));

  const ranked = rankCards([...setCards, ...byName.cards], {
    nameTokens,
    setIds,
    phrase: tokens.join(' '),
  });

  const usedNameTokens = nameTokens.filter((token) => !byName.ignored.includes(token));
  return {
    cards: ranked.map((card) => toCardListItem(card, sets)),
    search: {
      name: usedNameTokens.length > 0 ? usedNameTokens.join(' ') : null,
      sets: matched.sets.map((set) => set.name),
      ignored: byName.ignored,
    },
  };
}

export function upsertCard(record) {
  return prisma.card.upsert({
    where: { id: record.id },
    create: record,
    update: record,
  });
}
