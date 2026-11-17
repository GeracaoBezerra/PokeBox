import { TcgdexClient } from '../src/cards/catalog/TcgdexClient.js';
import type { CatalogEntry } from '../src/cards/search/CatalogSearchStore.js';
import { PrismaCatalogSearchStore } from '../src/cards/search/PrismaCatalogSearchStore.js';
import type { SetSummary } from '../src/cards/types.js';
import { loadDatabaseEnv } from '../src/config/env.js';
import { createPrismaClient } from '../src/lib/prisma.js';

const DEFAULT_LANGS = ['en', 'pt'];
const BATCH_SIZE = 500;
const PAUSE_MS = 200;
const RETRY_PAUSES_MS = [5000, 15000, 30000];

const env = loadDatabaseEnv();
const prisma = createPrismaClient(env.DATABASE_URL);
const store = new PrismaCatalogSearchStore(prisma);
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

async function syncLang(lang: string): Promise<string[]> {
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

  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  console.log(`${lang}: ${sets.length - failed.length} sets e ${cardCount} cartas sincronizados em ${seconds} s`);
  return failed.map((set) => `${lang}/${set.id}`);
}

async function main() {
  const langs = process.argv.length > 2 ? process.argv.slice(2) : DEFAULT_LANGS;
  const unknown = langs.filter((lang) => !DEFAULT_LANGS.includes(lang));
  if (unknown.length > 0) {
    throw new Error(`Idioma não suportado: ${unknown.join(', ')}. Use ${DEFAULT_LANGS.join(' ou ')}.`);
  }

  const failed: string[] = [];
  for (const lang of langs) {
    try {
      failed.push(...(await syncLang(lang)));
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
