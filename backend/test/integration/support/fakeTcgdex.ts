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
  close(): Promise<void>;
}

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
  const cards = loadSeedCards();
  const byId = new Map(cards.map((card) => [card.id, card]));
  const sets = setsOf(cards);
  let failure: number | null = null;

  const app = express();

  app.use((_req, res, next) => {
    if (failure !== null) return res.status(failure).json({ error: 'falha simulada' });
    return next();
  });

  app.get('/:lang/cards', (req: Request, res: Response) => {
    const name = String(req.query.name ?? '').toLowerCase();
    const page = Number(req.query['pagination:page'] ?? 1);
    const perPage = Number(req.query['pagination:itemsPerPage'] ?? 100);
    const matches = cards.filter((card) => card.name.toLowerCase().includes(name));
    res.json(matches.slice((page - 1) * perPage, page * perPage).map(brief));
  });

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
    close: () => new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve()))),
  };
}
