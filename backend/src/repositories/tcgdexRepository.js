import { MemoryCache } from '../utils/memoryCache.js';
import { TcgdexUnavailableError } from '../utils/tcgdexError.js';
import {
  tcgdexCardSchema,
  tcgdexCardBriefListSchema,
  tcgdexSetListSchema,
  tcgdexSetSchema,
  tcgdexSetWithCardsSchema,
} from './tcgdexSchema.js';


const TIMEOUT_MS = 8000;
const ONE_DAY = 24 * 60 * 60 * 1000;
const setMemory = new MemoryCache(ONE_DAY);
const setListMemory = new MemoryCache(ONE_DAY);
const setCardsMemory = new MemoryCache(ONE_DAY);

export class CardNotFoundError extends Error {}

async function requestTcgdex(path, schema) {
  const baseUrl = process.env.TCGDEX_BASE_URL ?? 'https://api.tcgdex.net/v2';
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(`${baseUrl}${path}`, { signal: controller.signal });
    if (res.status === 404) return null;
    if (!res.ok) throw new TcgdexUnavailableError(`TCGdex respondeu ${res.status}`);
    const parsed = schema.safeParse(await res.json());
    if (!parsed.success) {
      throw new TcgdexUnavailableError(`Resposta inesperada da TCGdex: ${parsed.error.message}`);
    }
    return parsed.data;
  } catch (err) {
    if (err instanceof TcgdexUnavailableError) throw err;
    if (err?.name === 'AbortError' || controller.signal.aborted) {
      throw new TcgdexUnavailableError(`TCGdex não respondeu em ${TIMEOUT_MS} ms`, { timeout: true, cause: err });
    }
    throw new TcgdexUnavailableError(`Falha ao chamar a TCGdex: ${err?.cause?.code ?? err?.cause?.message ?? err?.message}`, { cause: err });
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchCardFromTcgdex(id, lang = 'en') {
  const card = await requestTcgdex(`/${lang}/cards/${encodeURIComponent(id)}`, tcgdexCardSchema);
  if (!card) throw new CardNotFoundError(`Carta ${id} não encontrada`);
  const setInfo = await findSetInfo(card.set.id, lang);
  return toCardDetails(card, setInfo);
}

async function findSetInfo(setId, lang) {
  const key = `${lang}:${setId}`;
  const fromMemory = setMemory.get(key);
  if (fromMemory) return fromMemory;

  try {
    const setInfo = await fetchSetFromTcgdex(setId, lang);
    setMemory.set(key, setInfo);
    return setInfo;
  } catch (err) {
    console.error(`Falha ao buscar o set ${setId} na TCGdex:`, err.message);
    return { series: null, releaseDate: null };
  }
}

async function fetchSetFromTcgdex(setId, lang) {
  const set = await requestTcgdex(`/${lang}/sets/${encodeURIComponent(setId)}`, tcgdexSetSchema);
  if (!set) throw new Error('TCGdex respondeu 404');
  return {
    series: set.serie?.name ?? null,
    releaseDate: set.releaseDate ?? null,
  };
}

export async function searchCardsInTcgdex({ lang = 'en', name, page = 1, limit = 20 }) {
  const params = new URLSearchParams({
    'pagination:page': String(page),
    'pagination:itemsPerPage': String(limit),
  });
  if (name) params.set('name', name);

  const cards = await requestTcgdex(`/${lang}/cards?${params}`, tcgdexCardBriefListSchema);
  if (!cards) return [];
  return cards.map(toCardSummary);
}

export async function listSets(lang = 'en') {
  const fromMemory = setListMemory.get(lang);
  if (fromMemory) return fromMemory;

  try {
    const sets = await requestTcgdex(`/${lang}/sets`, tcgdexSetListSchema);
    if (!sets) return [];
    const list = sets.map(({ id, name, logo, symbol, cardCount }) => ({
      id,
      name,
      logo: logo ?? null,
      symbol: symbol ?? null,
      cardCount: cardCount ?? null,
    }));
    setListMemory.set(lang, list);
    return list;
  } catch (err) {
    console.error('Falha ao buscar a lista de sets na TCGdex:', err.message);
    return [];
  }
}

export async function listSetCards(setId, lang = 'en') {
  const key = `${lang}:${setId}`;
  const fromMemory = setCardsMemory.get(key);
  if (fromMemory) return fromMemory;

  const set = await requestTcgdex(`/${lang}/sets/${encodeURIComponent(setId)}`, tcgdexSetWithCardsSchema);
  if (!set) return [];
  const cards = set.cards.map(toCardSummary);
  setCardsMemory.set(key, cards);
  return cards;
}

function toCardSummary(card) {
  return {
    id: card.id,
    localId: card.localId,
    name: card.name,
    image: {
      small: card.image ? `${card.image}/low.webp` : null,
      large: card.image ? `${card.image}/high.webp` : null,
    },
  };
}


function pickMarketPrice(card) {
  const tcg = card.pricing?.tcgplayer;
  if (tcg) {
    const v = tcg.holofoil ?? tcg['unlimited-holofoil'] ?? tcg.normal ?? tcg.reverse ?? tcg['reverse-holofoil'];
    if (v?.marketPrice) {
      return { source: 'tcgplayer', value: v.marketPrice, currency: tcg.unit ?? 'USD', updatedAt: tcg.updated ?? null };
    }
  }
  const cm = card.pricing?.cardmarket;
  if (cm?.trend) return { source: 'cardmarket', value: cm.trend, currency: cm.unit ?? 'EUR', updatedAt: cm.updated ?? null };
  return null;
}

function toCardDetails(card, setInfo) {
  return {
    id: card.id,
    name: card.name,
    number: `${card.localId}/${card.set.cardCount.official}`,
    rarity: card.rarity ?? null,
    illustrator: card.illustrator ?? null,
    category: card.category,
   
    image: {
      small: card.image ? `${card.image}/low.webp` : null,
      large: card.image ? `${card.image}/high.webp` : null,
    },
    set: {
      id: card.set.id,
      name: card.set.name,
      logo: card.set.logo ? `${card.set.logo}.webp` : null,
      symbol: card.set.symbol ? `${card.set.symbol}.webp` : null,
      series: setInfo.series,
      releaseDate: setInfo.releaseDate,
    },
    hp: card.hp ?? null,
    types: card.types ?? [],
    stage: card.stage ?? null,
    evolveFrom: card.evolveFrom ?? null,
    description: card.description ?? card.effect ?? null,
    abilities: card.abilities ?? [],
    attacks: (card.attacks ?? []).map((a) => ({
      name: a.name,
      cost: a.cost ?? [],
      damage: a.damage != null ? String(a.damage) : null,
      effect: a.effect ?? null,
    })),
    weaknesses: (card.weaknesses ?? []).map((w) => ({ type: w.type, value: w.value ?? null })),
    resistances: (card.resistances ?? []).map((r) => ({ type: r.type, value: r.value ?? null })),
    retreat: card.retreat ?? null,
    dexId: card.dexId ?? [],
    regulationMark: card.regulationMark ?? null,
    legal: {
      standard: card.legal?.standard ?? false,
      expanded: card.legal?.expanded ?? false,
    },
    trainerType: card.trainerType ?? null,
    energyType: card.energyType ?? null,
    variants: {
      normal: card.variants.normal ?? false,
      reverse: card.variants.reverse ?? false,
      holo: card.variants.holo ?? false,
      firstEdition: card.variants.firstEdition ?? false,
    },
    marketPrice: pickMarketPrice(card),
  };
}
