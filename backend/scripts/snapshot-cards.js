import { writeFile } from 'node:fs/promises';

import { fetchCardFromTcgdex } from '../src/repositories/tcgdexRepository.js';
import { toCardRecord } from '../src/utils/cardRecord.js';

const CARD_IDS = [
  'base1-4',
  'base1-2',
  'base1-58',
  'sv03.5-006',
  'sv03.5-025',
  'sv03.5-151',
  'swsh3-136',
  'sv01-001',
  'sv01-196',
  'sve-002',
];

const OUTPUT = new URL('../prisma/seed-data/cards.json', import.meta.url);

async function main() {
  const cards = [];

  for (const id of CARD_IDS) {
    const details = await fetchCardFromTcgdex(id, 'en');
    cards.push({ ...toCardRecord(details), variants: details.variants });
    console.log(`ok ${id} · ${details.name}`);
  }

  await writeFile(OUTPUT, `${JSON.stringify(cards, null, 2)}\n`);
  console.log(`${cards.length} cartas salvas em prisma/seed-data/cards.json`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
