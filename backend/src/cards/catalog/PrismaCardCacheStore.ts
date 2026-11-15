import type { Db } from '../../lib/prisma.js';
import type { CardDetail } from '../types.js';
import type { CachedCard, CardCacheStore } from './CardCacheStore.js';

function isCardDetail(value: unknown): value is CardDetail {
  return typeof value === 'object' && value !== null && 'id' in value && typeof value.id === 'string';
}

export class PrismaCardCacheStore implements CardCacheStore {
  constructor(private readonly db: Db) {}

  async read(cardId: string, lang: string): Promise<CachedCard | null> {
    const row = await this.db.cardCache.findUnique({ where: { cardId_lang: { cardId, lang } } });
    if (!row || !isCardDetail(row.data)) return null;
    return { data: row.data, updatedAt: row.updatedAt };
  }

  async write(cardId: string, lang: string, data: CardDetail): Promise<void> {
    await this.db.cardCache.upsert({
      where: { cardId_lang: { cardId, lang } },
      create: { cardId, lang, data },
      update: { data },
    });
  }
}
