import { PrismaCardCacheStore } from '../src/cards/catalog/PrismaCardCacheStore.js';
import { TcgdexClient } from '../src/cards/catalog/TcgdexClient.js';
import type { CatalogEntry } from '../src/cards/search/CatalogSearchStore.js';
import { PrismaCatalogSearchStore, type CatalogAttributes } from '../src/cards/search/PrismaCatalogSearchStore.js';
import type { CardFilters, CardFilterValues, SetSummary } from '../src/cards/types.js';
import { loadDatabaseEnv } from '../src/config/env.js';
import { CardNotFoundError } from '../src/errors/CardNotFoundError.js';
import { createPrismaClient } from '../src/lib/prisma.js';
import { PrismaCardRepository } from '../src/repositories/PrismaCardRepository.js';

const DEFAULT_LANGS = ['en', 'pt'];
const BATCH_SIZE = 500;
const ALL_CARDS = 100000;
const FILTER_LISTS: [keyof CardFilterValues, 'type' | 'rarity' | 'category'][] = [
  ['types', 'type'],
  ['rarities', 'rarity'],
  ['categories', 'category'],
];
const PAUSE_MS = 200;
const DETAIL_WORKERS = 4;
const PROGRESS_EVERY = 500;
const REFRESH_DETAILS = '--refresh-details';
const RETRY_PAUSES_MS = [5000, 15000, 30000];

const env = loadDatabaseEnv();
const prisma = createPrismaClient(env.DATABASE_URL);
const store = new PrismaCatalogSearchStore(prisma);
const cardCache = new PrismaCardCacheStore(prisma);
const cards = new PrismaCardRepository(prisma);
const tcgdex = new TcgdexClient({
  baseUrl: process.env.TCGDEX_BASE_URL || 'https://api.tcgdex.net/v2',
  timeoutMs: 15000,
  fetch: (url, init) => fetch(url, init),
});

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

async function syncSet(lang: string, set: SetSummary): Promise<number> {
  const cards = await tcgdex.listSetCards(set.id, lang);
  const entries: CatalogEntry[] = cards.map((card) => ({
    id: card.id,
    localId: card.localId,
    name: card.name,
    setId: set.id,
    setName: set.name,
    imageUrl: card.image.small,
  }));
  for (let start = 0; start < entries.length; start += BATCH_SIZE) {
    await store.save(lang, entries.slice(start, start + BATCH_SIZE));
  }
  return entries.length;
}

async function syncSets(lang: string, sets: SetSummary[], label: string) {
  let cardCount = 0;
  const failed: SetSummary[] = [];

  for (const [index, set] of sets.entries()) {
    const prefix = `[${lang}${label} ${index + 1}/${sets.length}] ${set.id} · ${set.name}`;
    try {
      const count = await syncSet(lang, set);
      cardCount += count;
      console.log(`${prefix}: ${count} cartas`);
    } catch (err) {
      failed.push(set);
      console.error(`${prefix}: falhou (${errorMessage(err)})`);
    }
    await wait(PAUSE_MS);
  }

  return { cardCount, failed };
}

async function listSets(lang: string): Promise<SetSummary[]> {
  let sets = await tcgdex.listSets(lang);
  for (const pause of RETRY_PAUSES_MS) {
    if (sets.length > 0) break;
    console.log(`${lang}: a TCGdex não devolveu a lista de sets; tentando de novo em ${pause / 1000} s`);
    await wait(pause);
    sets = await tcgdex.listSets(lang);
  }
  return sets;
}

async function withRetries<T>(label: string, load: () => Promise<T>): Promise<T> {
  for (const pause of RETRY_PAUSES_MS) {
    try {
      return await load();
    } catch (err) {
      console.log(`${label}: falhou (${errorMessage(err)}); tentando de novo em ${pause / 1000} s`);
      await wait(pause);
    }
  }
  return load();
}

async function cardIdsWith(lang: string, filter: keyof CardFilters, value: string): Promise<string[]> {
  const cards = await withRetries(`${lang} ${filter}=${value}`, () =>
    tcgdex.search({ lang, page: 1, limit: ALL_CARDS, filters: { [filter]: value } }),
  );
  await wait(PAUSE_MS);
  return cards.map((card) => card.id);
}

async function syncFilters(lang: string): Promise<void> {
  const values = await withRetries(`${lang} filtros`, async () => {
    const found = await tcgdex.listFilterValues(lang);
    if (FILTER_LISTS.some(([list]) => found[list].length === 0)) throw new Error('lista de filtros incompleta');
    return found;
  });

  const attributes = new Map<string, CatalogAttributes>();
  const of = (id: string) => {
    const known = attributes.get(id) ?? { id, types: [], rarity: null, category: null };
    attributes.set(id, known);
    return known;
  };
  for (const [list, filter] of FILTER_LISTS) {
    for (const value of values[list]) {
      for (const id of await cardIdsWith(lang, filter, value)) {
        const card = of(id);
        if (filter === 'type') card.types.push(value);
        else card[filter] = value;
      }
    }
  }

  const cards = [...attributes.values()];
  let updated = 0;
  for (let start = 0; start < cards.length; start += BATCH_SIZE) {
    updated += await store.saveAttributes(lang, cards.slice(start, start + BATCH_SIZE));
  }
  await store.saveFilterValues(lang, values);
  console.log(`${lang}: tipo, raridade e categoria gravados em ${updated} cartas`);
}

async function syncDetail(lang: string, id: string): Promise<void> {
  const card = await tcgdex.getById(id, lang);
  await cardCache.write(card.id, lang, card);
  await cards.refreshPrice(card.id, card.marketPrice);
}

async function syncDetailBatch(lang: string, ids: string[], label: string) {
  const failed: string[] = [];
  const notFound: string[] = [];
  const reasons = new Map<string, string>();
  let next = 0;
  let done = 0;

  const worker = async () => {
    while (next < ids.length) {
      const id = ids[next++];
      try {
        await syncDetail(lang, id);
      } catch (err) {
        if (err instanceof CardNotFoundError) {
          notFound.push(id);
        } else {
          failed.push(id);
          reasons.set(id, errorMessage(err).split('\n')[0]);
        }
      }
      done += 1;
      if (done % PROGRESS_EVERY === 0 || done === ids.length) {
        console.log(`[${lang} detalhes${label}] ${done}/${ids.length}`);
      }
    }
  };
  await Promise.all(Array.from({ length: DETAIL_WORKERS }, worker));

  return { failed, notFound, reasons };
}

async function syncDetails(lang: string, refresh: boolean): Promise<string[]> {
  const started = Date.now();
  const ids = await store.cardIds(lang, { withoutDetail: !refresh });
  if (ids.length === 0) {
    console.log(`${lang}: o detalhe de todas as cartas já está guardado`);
    return [];
  }
  console.log(`${lang}: buscando o detalhe de ${ids.length} cartas`);

  let { failed, notFound, reasons } = await syncDetailBatch(lang, ids, '');
  for (const [round, pause] of RETRY_PAUSES_MS.entries()) {
    if (failed.length === 0) break;
    console.log(`${lang}: ${failed.length} detalhes falharam; tentando de novo em ${pause / 1000} s`);
    await wait(pause);
    const retry = await syncDetailBatch(lang, failed, ` volta ${round + 2}`);
    failed = retry.failed;
    notFound = [...notFound, ...retry.notFound];
    reasons = retry.reasons;
  }

  for (const id of failed.slice(0, 10)) {
    console.error(`${lang}: detalhe de ${id} falhou (${reasons.get(id)})`);
  }

  if (notFound.length > 0) {
    console.log(`${lang}: ${notFound.length} cartas sem detalhe na TCGdex (${notFound.slice(0, 10).join(', ')})`);
  }
  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  const saved = ids.length - failed.length - notFound.length;
  console.log(`${lang}: detalhe de ${saved} cartas guardado em ${seconds} s`);
  return failed.length > 0 ? [`${lang} (detalhe de ${failed.length} cartas)`] : [];
}

async function syncLang(lang: string, refreshDetails: boolean): Promise<string[]> {
  const started = Date.now();
  const sets = await listSets(lang);
  if (sets.length === 0) throw new Error(`A TCGdex não devolveu nenhum set em ${lang}; nada foi sincronizado`);
  console.log(`${sets.length} sets na TCGdex (${lang})`);

  let { cardCount, failed } = await syncSets(lang, sets, '');
  for (const [round, pause] of RETRY_PAUSES_MS.entries()) {
    if (failed.length === 0) break;
    console.log(`${lang}: ${failed.length} sets falharam; tentando de novo em ${pause / 1000} s`);
    await wait(pause);
    const retry = await syncSets(lang, failed, ` volta ${round + 2}`);
    cardCount += retry.cardCount;
    failed = retry.failed;
  }

  await store.saveSets(lang, sets.map(({ id, name }) => ({ id, name })));
  const failedFilters: string[] = [];
  try {
    await syncFilters(lang);
  } catch (err) {
    console.error(`${lang}: filtros não sincronizados (${errorMessage(err)})`);
    failedFilters.push(`${lang} (filtros)`);
  }

  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  console.log(`${lang}: ${sets.length - failed.length} sets e ${cardCount} cartas sincronizados em ${seconds} s`);
  const failedDetails = await syncDetails(lang, refreshDetails);
  return [...failed.map((set) => `${lang}/${set.id}`), ...failedFilters, ...failedDetails];
}

async function main() {
  const args = process.argv.slice(2);
  const refreshDetails = args.includes(REFRESH_DETAILS);
  const chosen = args.filter((arg) => arg !== REFRESH_DETAILS);
  const langs = chosen.length > 0 ? chosen : DEFAULT_LANGS;
  const unknown = langs.filter((lang) => !DEFAULT_LANGS.includes(lang));
  if (unknown.length > 0) {
    throw new Error(`Idioma não suportado: ${unknown.join(', ')}. Use ${DEFAULT_LANGS.join(' ou ')}.`);
  }

  const failed: string[] = [];
  for (const lang of langs) {
    try {
      failed.push(...(await syncLang(lang, refreshDetails)));
    } catch (err) {
      console.error(`${lang}: ${errorMessage(err)}`);
      failed.push(`${lang} (lista de sets)`);
    }
  }
  if (failed.length > 0) {
    throw new Error(`Falharam: ${failed.join(', ')}. Rode de novo para tentar outra vez.`);
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
