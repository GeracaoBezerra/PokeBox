import { TcgdexClient } from '../src/cards/catalog/TcgdexClient.js';
import type { CatalogEntry } from '../src/cards/search/CatalogSearchStore.js';
import { PrismaCatalogSearchStore } from '../src/cards/search/PrismaCatalogSearchStore.js';
import { loadDatabaseEnv } from '../src/config/env.js';
import { createPrismaClient } from '../src/lib/prisma.js';

const LANG = 'en';
const BATCH_SIZE = 500;
const PAUSE_MS = 200;

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

async function main() {
  const started = Date.now();
  const sets = await tcgdex.listSets(LANG);
  if (sets.length === 0) throw new Error('A TCGdex não devolveu nenhum set; nada foi sincronizado');
  console.log(`${sets.length} sets na TCGdex (${LANG})`);

  let cardCount = 0;
  const failed: string[] = [];

  for (const [index, set] of sets.entries()) {
    try {
      const cards = await tcgdex.listSetCards(set.id, LANG);
      const entries: CatalogEntry[] = cards.map((card) => ({
        id: card.id,
        localId: card.localId,
        name: card.name,
        setId: set.id,
        setName: set.name,
        imageUrl: card.image.small,
      }));
      for (let start = 0; start < entries.length; start += BATCH_SIZE) {
        await store.save(LANG, entries.slice(start, start + BATCH_SIZE));
      }
      cardCount += entries.length;
      console.log(`[${index + 1}/${sets.length}] ${set.id} · ${set.name}: ${entries.length} cartas`);
    } catch (err) {
      failed.push(set.id);
      console.error(`[${index + 1}/${sets.length}] ${set.id} · ${set.name}: falhou (${errorMessage(err)})`);
    }
    await wait(PAUSE_MS);
  }

  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  console.log(`${sets.length - failed.length} sets e ${cardCount} cartas sincronizados em ${seconds} s`);
  if (failed.length > 0) {
    throw new Error(`${failed.length} sets falharam: ${failed.join(', ')}. Rode de novo para tentar outra vez.`);
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
