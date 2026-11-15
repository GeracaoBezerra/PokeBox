import { writeFile } from 'node:fs/promises';

import { TcgdexClient } from '../src/cards/catalog/TcgdexClient.js';
import type { CardDetail } from '../src/cards/types.js';
import { toCardRecord } from '../src/utils/cardRecord.js';

const CARD_IDS = [
  'base1-4',
  'base1-2',
  'base1-58',
  'base1-10',
  'base1-15',
  'base1-16',
  'base1-44',
  'base1-46',
  'base1-63',
  'base1-88',
  'base1-91',
  'base1-96',
  'base1-98',
  'base1-102',
  'base2-51',
  'base2-60',
  'base3-4',
  'base3-5',
  'neo1-9',
  'neo1-17',
  'neo1-96',
  'ex1-101',
  'dp1-1',
  'dp1-6',
  'dp1-11',
  'xy1-41',
  'xy1-97',
  'xy1-140',
  'sm1-9',
  'sm1-61',
  'sm1-80',
  'sm1-129',
  'swsh1-1',
  'swsh1-142',
  'swsh1-178',
  'swsh3-136',
  'swsh4-25',
  'swsh4-44',
  'swsh7-75',
  'swsh7-111',
  'swsh7-125',
  'swsh7-215',
  'swsh9-018',
  'swsh9-123',
  'swsh9-132',
  'swsh9-151',
  'swsh12.5-020',
  'swsh12.5-060',
  'swsh12.5-160',
  'sv01-001',
  'sv01-081',
  'sv01-125',
  'sv01-166',
  'sv01-181',
  'sv01-196',
  'sv01-257',
  'sv02-063',
  'sv02-172',
  'sv02-185',
  'sv02-279',
  'sv03-125',
  'sv03-130',
  'sv03-230',
  'sv03.5-001',
  'sv03.5-004',
  'sv03.5-006',
  'sv03.5-007',
  'sv03.5-025',
  'sv03.5-054',
  'sv03.5-094',
  'sv03.5-129',
  'sv03.5-130',
  'sv03.5-133',
  'sv03.5-143',
  'sv03.5-150',
  'sv03.5-151',
  'sv03.5-173',
  'sv03.5-199',
  'sv03.5-205',
  'sv03.5-207',
  'sv04-038',
  'sv04-171',
  'sv04.5-054',
  'sv06-106',
  'sv06-167',
  'sv08-057',
  'sv08-086',
];

const VALID_ID = /^[a-zA-Z0-9.\-]+$/;

const tcgdex = new TcgdexClient({
  baseUrl: process.env.TCGDEX_BASE_URL || 'https://api.tcgdex.net/v2',
  timeoutMs: 8000,
  fetch: (url, init) => fetch(url, init),
});

const OUTPUT = new URL('../prisma/seed-data/cards.json', import.meta.url);

function refusalReason(id: string, details?: CardDetail): string | null {
  if (!VALID_ID.test(id)) return 'id fora do padrão ^[a-zA-Z0-9.-]+$';
  if (details && !details.image.small) return 'sem imagem na TCGdex';
  return null;
}

async function main() {
  const duplicated = CARD_IDS.filter((id, index) => CARD_IDS.indexOf(id) !== index);
  if (duplicated.length > 0) throw new Error(`Ids repetidos na lista: ${duplicated.join(', ')}`);

  const cards = [];
  const refused: string[] = [];

  for (const id of CARD_IDS) {
    const invalidId = refusalReason(id);
    if (invalidId) {
      refused.push(`${id} (${invalidId})`);
      continue;
    }

    const details = await tcgdex.getById(id, 'en');
    const reason = refusalReason(id, details);
    if (reason) {
      refused.push(`${id} (${reason})`);
      console.log(`recusada ${id} · ${details.name}: ${reason}`);
      continue;
    }

    cards.push({ ...toCardRecord(details), variants: details.variants });
    console.log(`ok ${id} · ${details.name}`);
  }

  if (refused.length > 0) {
    throw new Error(`Cartas recusadas, troque na lista e rode de novo: ${refused.join('; ')}`);
  }

  await writeFile(OUTPUT, `${JSON.stringify(cards, null, 2)}\n`);
  console.log(`${cards.length} cartas salvas em prisma/seed-data/cards.json`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
