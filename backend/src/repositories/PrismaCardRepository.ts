import type { CardPriceWriter } from '../cards/catalog/DbCachedCatalog.js';
import type { MarketPrice } from '../cards/types.js';
import type { Card } from '../generated/prisma/index.js';
import type { Db } from '../lib/prisma.js';
import { toMarketPriceFields, type CardRecord } from '../utils/cardRecord.js';

export interface CardRepository extends CardPriceWriter {
  upsertCard(record: CardRecord): Promise<Card>;
}

export class PrismaCardRepository implements CardRepository {
  constructor(private readonly db: Db) {}

  upsertCard(record: CardRecord): Promise<Card> {
    return this.db.card.upsert({
      where: { id: record.id },
      create: record,
      update: record,
    });
  }

  async refreshPrice(cardId: string, marketPrice: MarketPrice | null): Promise<void> {
    await this.db.card.updateMany({
      where: { id: cardId },
      data: toMarketPriceFields(marketPrice),
    });
  }
}
