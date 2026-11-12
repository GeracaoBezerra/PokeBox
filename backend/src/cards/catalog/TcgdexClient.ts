import type { z } from 'zod';

import { CardNotFoundError } from '../../errors/CardNotFoundError.js';
import { TcgdexUnavailableError } from '../../errors/TcgdexUnavailableError.js';
import type { Logger } from '../../lib/logger.js';
import { MemoryCache } from '../../utils/memoryCache.js';
import type { CardDetail, CardSummary, MarketPrice, SetInfo, SetSummary } from '../types.js';
import type { CardCatalog, CardSearchQuery } from './CardCatalog.js';
import {
  tcgdexCardBriefListSchema,
  tcgdexCardSchema,
  tcgdexPricingSchema,
  tcgdexSetListSchema,
  tcgdexSetSchema,
  tcgdexSetWithCardsSchema,
  type TcgdexCard,
  type TcgdexCardBrief,
} from './tcgdexSchema.js';

export type FetchFn = (url: string, init?: { signal?: AbortSignal }) => Promise<Response>;

export interface TcgdexClientOptions {
  baseUrl: string;
  timeoutMs: number;
  fetch: FetchFn;
  logger?: Logger;
  setTtlMs?: number;
}

const ONE_DAY = 24 * 60 * 60 * 1000;

function errorDetail(err: unknown): string | undefined {
  if (!(err instanceof Error)) return undefined;
  const cause = err.cause;
  if (cause && typeof cause === 'object') {
    if ('code' in cause && cause.code != null) return String(cause.code);
    if ('message' in cause && cause.message != null) return String(cause.message);
  }
  return err.message;
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function toImage(base: string | undefined) {
  return {
    small: base ? `${base}/low.webp` : null,
    large: base ? `${base}/high.webp` : null,
  };
}

function toCardSummary(card: TcgdexCardBrief): CardSummary {
  return {
    id: card.id,
    localId: card.localId,
    name: card.name,
    image: toImage(card.image),
  };
}

function pickMarketPrice(pricing: unknown): MarketPrice | null {
  const parsed = tcgdexPricingSchema.safeParse(pricing ?? {});
  if (!parsed.success) return null;

  const tcg = parsed.data.tcgplayer;
  if (tcg) {
    const v = tcg.holofoil ?? tcg['unlimited-holofoil'] ?? tcg.normal ?? tcg.reverse ?? tcg['reverse-holofoil'];
    if (v?.marketPrice) {
      return { source: 'tcgplayer', value: v.marketPrice, currency: tcg.unit ?? 'USD', updatedAt: tcg.updated ?? null };
    }
  }
  const cm = parsed.data.cardmarket;
  if (cm?.trend) return { source: 'cardmarket', value: cm.trend, currency: cm.unit ?? 'EUR', updatedAt: cm.updated ?? null };
  return null;
}

function toCardDetail(card: TcgdexCard, setInfo: SetInfo): CardDetail {
  return {
    id: card.id,
    name: card.name,
    number: `${card.localId}/${card.set.cardCount.official}`,
    rarity: card.rarity ?? null,
    illustrator: card.illustrator ?? null,
    category: card.category,
    image: toImage(card.image),
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
    marketPrice: pickMarketPrice(card.pricing),
  };
}

export class TcgdexClient implements CardCatalog {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly fetch: FetchFn;
  private readonly logger: Logger;
  private readonly setInfoMemory: MemoryCache<SetInfo>;
  private readonly setListMemory: MemoryCache<SetSummary[]>;
  private readonly setCardsMemory: MemoryCache<CardSummary[]>;

  constructor({ baseUrl, timeoutMs, fetch, logger = console, setTtlMs = ONE_DAY }: TcgdexClientOptions) {
    this.baseUrl = baseUrl;
    this.timeoutMs = timeoutMs;
    this.fetch = fetch;
    this.logger = logger;
    this.setInfoMemory = new MemoryCache(setTtlMs);
    this.setListMemory = new MemoryCache(setTtlMs);
    this.setCardsMemory = new MemoryCache(setTtlMs);
  }

  async getById(id: string, lang: string): Promise<CardDetail> {
    const card = await this.request(`/${lang}/cards/${encodeURIComponent(id)}`, tcgdexCardSchema);
    if (!card) throw new CardNotFoundError(`Carta ${id} não encontrada`);
    const setInfo = await this.findSetInfo(card.set.id, lang);
    return toCardDetail(card, setInfo);
  }

  async search({ lang, name, page, limit }: CardSearchQuery): Promise<CardSummary[]> {
    const params = new URLSearchParams({
      'pagination:page': String(page),
      'pagination:itemsPerPage': String(limit),
    });
    if (name) params.set('name', name);

    const cards = await this.request(`/${lang}/cards?${params}`, tcgdexCardBriefListSchema);
    if (!cards) return [];
    return cards.map(toCardSummary);
  }

  async listSets(lang: string): Promise<SetSummary[]> {
    const fromMemory = this.setListMemory.get(lang);
    if (fromMemory) return fromMemory;

    try {
      const sets = await this.request(`/${lang}/sets`, tcgdexSetListSchema);
      if (!sets) return [];
      const list = sets.map(({ id, name, logo, symbol, cardCount }) => ({
        id,
        name,
        logo: logo ?? null,
        symbol: symbol ?? null,
        cardCount: cardCount ?? null,
      }));
      this.setListMemory.set(lang, list);
      return list;
    } catch (err) {
      this.logger.error('Falha ao buscar a lista de sets na TCGdex:', errorMessage(err));
      return [];
    }
  }

  async listSetCards(setId: string, lang: string): Promise<CardSummary[]> {
    const key = `${lang}:${setId}`;
    const fromMemory = this.setCardsMemory.get(key);
    if (fromMemory) return fromMemory;

    const set = await this.request(`/${lang}/sets/${encodeURIComponent(setId)}`, tcgdexSetWithCardsSchema);
    if (!set) return [];
    const cards = set.cards.map(toCardSummary);
    this.setCardsMemory.set(key, cards);
    return cards;
  }

  private async findSetInfo(setId: string, lang: string): Promise<SetInfo> {
    const key = `${lang}:${setId}`;
    const fromMemory = this.setInfoMemory.get(key);
    if (fromMemory) return fromMemory;

    try {
      const set = await this.request(`/${lang}/sets/${encodeURIComponent(setId)}`, tcgdexSetSchema);
      if (!set) throw new Error('TCGdex respondeu 404');
      const setInfo = { series: set.serie?.name ?? null, releaseDate: set.releaseDate ?? null };
      this.setInfoMemory.set(key, setInfo);
      return setInfo;
    } catch (err) {
      this.logger.error(`Falha ao buscar o set ${setId} na TCGdex:`, errorMessage(err));
      return { series: null, releaseDate: null };
    }
  }

  private async request<S extends z.ZodType>(path: string, schema: S): Promise<z.output<S> | null> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const res = await this.fetch(`${this.baseUrl}${path}`, { signal: controller.signal });
      if (res.status === 404) return null;
      if (!res.ok) throw new TcgdexUnavailableError(`TCGdex respondeu ${res.status}`);
      const parsed = schema.safeParse(await res.json());
      if (!parsed.success) {
        throw new TcgdexUnavailableError(`Resposta inesperada da TCGdex: ${parsed.error.message}`);
      }
      return parsed.data;
    } catch (err) {
      if (err instanceof TcgdexUnavailableError) throw err;
      if ((err instanceof Error && err.name === 'AbortError') || controller.signal.aborted) {
        throw new TcgdexUnavailableError(`TCGdex não respondeu em ${this.timeoutMs} ms`, { timeout: true, cause: err });
      }
      throw new TcgdexUnavailableError(`Falha ao chamar a TCGdex: ${errorDetail(err)}`, { cause: err });
    } finally {
      clearTimeout(timer);
    }
  }
}
