import { readFileSync } from 'node:fs';
import type { AddressInfo } from 'node:net';
import { fileURLToPath } from 'node:url';

import express, { type Request, type Response } from 'express';

interface SeedCard {
  id: string;
  name: string;
  setId: string;
  setName: string;
  setSeries: string | null;
  releaseDate: string | null;
  number: string;
  rarity: string | null;
  imageUrl: string | null;
  category: string;
  types: string[];
  hp: number | null;
  stage: string | null;
  illustrator: string | null;
  dexId: number[];
  regulationMark: string | null;
  trainerType: string | null;
  energyType: string | null;
  marketPrice: number | null;
  marketPriceCurrency: string | null;
  marketPriceSource: string | null;
  marketPriceUpdatedAt: string | null;
  variants: { normal: boolean; reverse: boolean; holo: boolean; firstEdition: boolean };
}

export interface FakeTcgdex {
  url: string;
  cards: SeedCard[];
  failWith(status: number | null): void;
  failNext(status: number, times: number): void;
  calls(): number;
  close(): Promise<void>;
}

const LIST_ONLY_CARDS = [
  { id: 'exu-!', localId: '!', name: 'Unown' },
  { id: 'exu-A', localId: 'A', name: 'Unown' },
];

export const CARD_OUTSIDE_SEED: SeedCard = {
  id: 'itest-1',
  name: 'Testemon',
  setId: 'itest',
  setName: 'Integração',
  setSeries: 'Testes',
  releaseDate: '2026-11-15T00:00:00.000Z',
  number: '1/1',
  rarity: 'Rare',
  imageUrl: 'https://assets.tcgdex.net/en/itest/itest/1/low.webp',
  category: 'Pokemon',
  types: ['Psychic'],
  hp: 60,
  stage: 'Basic',
  illustrator: 'Equipe PokeBox',
  dexId: [],
  regulationMark: null,
  trainerType: null,
  energyType: null,
  marketPrice: 2.5,
  marketPriceCurrency: 'USD',
  marketPriceSource: 'tcgplayer',
  marketPriceUpdatedAt: '2026-11-15T00:00:00.000Z',
  variants: { normal: true, reverse: false, holo: false, firstEdition: false },
};

const seedCardsFile = fileURLToPath(new URL('../../../prisma/seed-data/cards.json', import.meta.url));

function loadSeedCards(): SeedCard[] {
  return JSON.parse(readFileSync(seedCardsFile, 'utf8')) as SeedCard[];
}

function imageBase(card: SeedCard): string | undefined {
  return card.imageUrl?.replace(/\/(low|high)\.webp$/, '');
}

function brief(card: SeedCard) {
  return { id: card.id, localId: card.number.split('/')[0], name: card.name, image: imageBase(card) };
}

function pricing(card: SeedCard) {
  if (card.marketPrice == null) return {};
  if (card.marketPriceSource === 'cardmarket') {
    return { cardmarket: { trend: card.marketPrice, unit: card.marketPriceCurrency, updated: card.marketPriceUpdatedAt } };
  }
  return {
    tcgplayer: {
      unit: card.marketPriceCurrency,
      updated: card.marketPriceUpdatedAt,
      holofoil: { marketPrice: card.marketPrice },
    },
  };
}

function detail(card: SeedCard) {
  const [localId, official] = card.number.split('/');
  const count = Number(official) || 0;

  return {
    ...brief(card),
    localId,
    category: card.category,
    illustrator: card.illustrator ?? undefined,
    rarity: card.rarity ?? undefined,
    set: { id: card.setId, name: card.setName, cardCount: { official: count, total: count } },
    variants: card.variants,
    hp: card.hp ?? undefined,
    types: card.types.length > 0 ? card.types : undefined,
    stage: card.stage ?? undefined,
    dexId: card.dexId.length > 0 ? card.dexId : undefined,
    regulationMark: card.regulationMark ?? undefined,
    trainerType: card.trainerType ?? undefined,
    energyType: card.energyType ?? undefined,
    pricing: pricing(card),
  };
}

const LIST_FILTERS: [string, (card: SeedCard) => (string | null)[]][] = [
  ['types', (card) => card.types],
  ['rarity', (card) => [card.rarity]],
  ['set.id', (card) => [card.setId]],
  ['category', (card) => [card.category]],
];

function exact(value: unknown): string | null {
  return typeof value === 'string' && value.startsWith('eq:') ? value.slice(3) : null;
}

function matchesFilters(card: SeedCard, query: Request['query']): boolean {
  return LIST_FILTERS.every(([param, valuesOf]) => {
    const wanted = exact(query[param]);
    return wanted === null || valuesOf(card).includes(wanted);
  });
}

function distinct(values: (string | null)[]): string[] {
  return [...new Set(values.filter((value): value is string => value !== null))].sort();
}

function setsOf(cards: SeedCard[]) {
  const sets = new Map<string, { id: string; name: string; serie?: { id: string; name: string }; releaseDate?: string; cards: SeedCard[] }>();

  for (const card of cards) {
    const set = sets.get(card.setId) ?? {
      id: card.setId,
      name: card.setName,
      serie: card.setSeries ? { id: card.setSeries.toLowerCase(), name: card.setSeries } : undefined,
      releaseDate: card.releaseDate?.slice(0, 10),
      cards: [],
    };
    set.cards.push(card);
    sets.set(card.setId, set);
  }

  return sets;
}

export async function startFakeTcgdex(): Promise<FakeTcgdex> {
  const cards = [...loadSeedCards(), CARD_OUTSIDE_SEED];
  const byId = new Map(cards.map((card) => [card.id, card]));
  const sets = setsOf(cards);
  let failure: number | null = null;
  let nextFailures: number[] = [];
  let calls = 0;

  const app = express();

  app.use((_req, res, next) => {
    calls++;
    const status = nextFailures.shift() ?? failure;
    if (status !== null) return res.status(status).json({ error: 'falha simulada' });
    return next();
  });

  app.get('/:lang/cards', (req: Request, res: Response) => {
    const name = String(req.query.name ?? '').toLowerCase();
    const page = Number(req.query['pagination:page'] ?? 1);
    const perPage = Number(req.query['pagination:itemsPerPage'] ?? 100);
    const filtered = LIST_FILTERS.some(([param]) => req.query[param] !== undefined);
    const listed = filtered
      ? cards.filter((card) => matchesFilters(card, req.query)).map(brief)
      : [...cards.map(brief), ...LIST_ONLY_CARDS];
    const matches = listed.filter((card) => card.name.toLowerCase().includes(name));
    if (req.query['sort:field'] === 'name') {
      const direction = req.query['sort:order'] === 'DESC' ? -1 : 1;
      matches.sort((a, b) => direction * a.name.localeCompare(b.name));
    }
    res.json(matches.slice((page - 1) * perPage, page * perPage));
  });

  app.get('/:lang/types', (_req: Request, res: Response) => res.json(distinct(cards.flatMap((card) => card.types))));
  app.get('/:lang/rarities', (_req: Request, res: Response) => res.json(distinct(cards.map((card) => card.rarity))));
  app.get('/:lang/categories', (_req: Request, res: Response) => res.json(distinct(cards.map((card) => card.category))));

  app.get('/:lang/cards/:id', (req: Request<{ id: string }>, res: Response) => {
    const card = byId.get(req.params.id);
    if (!card) return res.status(404).json({ error: 'not found' });
    return res.json(detail(card));
  });

  app.get('/:lang/sets', (_req: Request, res: Response) => {
    res.json(
      [...sets.values()].map((set) => ({
        id: set.id,
        name: set.name,
        cardCount: { total: set.cards.length, official: set.cards.length },
      })),
    );
  });

  app.get('/:lang/sets/:id', (req: Request<{ id: string }>, res: Response) => {
    const set = sets.get(req.params.id);
    if (!set) return res.status(404).json({ error: 'not found' });
    const { cards: setCards, ...info } = set;
    return res.json({ ...info, cards: setCards.map(brief) });
  });

  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const { port } = server.address() as AddressInfo;

  return {
    url: `http://127.0.0.1:${port}`,
    cards,
    failWith(status) {
      failure = status;
    },
    failNext(status, times) {
      nextFailures = Array.from({ length: times }, () => status);
    },
    calls: () => calls,
    close: () => new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve()))),
  };
}
