import { MemoryCache } from '../utils/memoryCache.js';
import { tcgdexCardSchema, tcgdexCardBriefListSchema, tcgdexSetSchema } from './tcgdexSchema.js';


const TIMEOUT_MS = 8000;
const ONE_DAY = 24 * 60 * 60 * 1000;
const setMemory = new MemoryCache(ONE_DAY);

export class CardNotFoundError extends Error {}

export async function fetchCardFromTcgdex(id, lang = 'en') {
  const baseUrl = process.env.TCGDEX_BASE_URL ?? 'https://api.tcgdex.net/v2';
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(`${baseUrl}/${lang}/cards/${encodeURIComponent(id)}`, { signal: controller.signal });
    if (res.status === 404) throw new CardNotFoundError(`Carta ${id} não encontrada`);
    if (!res.ok) throw new Error(`TCGdex respondeu ${res.status}`);
    const parsed = tcgdexCardSchema.safeParse(await res.json());
    if (!parsed.success) throw new Error(`Resposta inesperada da TCGdex: ${parsed.error.message}`);
    const setInfo = await findSetInfo(parsed.data.set.id, lang);
    return toCardDetails(parsed.data, setInfo);
  } finally {
    clearTimeout(timer);
  }
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
  const baseUrl = process.env.TCGDEX_BASE_URL ?? 'https://api.tcgdex.net/v2';
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(`${baseUrl}/${lang}/sets/${encodeURIComponent(setId)}`, { signal: controller.signal });
    if (!res.ok) throw new Error(`TCGdex respondeu ${res.status}`);
    const parsed = tcgdexSetSchema.safeParse(await res.json());
    if (!parsed.success) throw new Error(`Resposta inesperada da TCGdex: ${parsed.error.message}`);
    return {
      series: parsed.data.serie?.name ?? null,
      releaseDate: parsed.data.releaseDate ?? null,
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function searchCardsInTcgdex({ lang = 'en', name, page = 1, limit = 20 }) {
  const baseUrl = process.env.TCGDEX_BASE_URL ?? 'https://api.tcgdex.net/v2';
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  const params = new URLSearchParams({
    'pagination:page': String(page),
    'pagination:itemsPerPage': String(limit),
  });
  if (name) params.set('name', name);

  try {
    const res = await fetch(`${baseUrl}/${lang}/cards?${params}`, { signal: controller.signal });
    if (res.status === 404) return [];
    if (!res.ok) throw new Error(`TCGdex respondeu ${res.status}`);
    const parsed = tcgdexCardBriefListSchema.safeParse(await res.json());
    if (!parsed.success) throw new Error(`Resposta inesperada da TCGdex: ${parsed.error.message}`);
    return parsed.data.map(toCardSummary);
  } finally {
    clearTimeout(timer);
  }
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
    if (v?.marketPrice) return { source: 'tcgplayer', value: v.marketPrice, currency: tcg.unit ?? 'USD' };
  }
  const cm = card.pricing?.cardmarket;
  if (cm?.trend) return { source: 'cardmarket', value: cm.trend, currency: cm.unit ?? 'EUR' };
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
