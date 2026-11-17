import { Prisma } from '../../generated/prisma/index.js';
import type { Db } from '../../lib/prisma.js';
import type { CatalogEntry, CatalogSearch, CatalogSearchStore, CatalogSet } from './CatalogSearchStore.js';

const normalized = (text: string) => Prisma.sql`lower(unaccent(${text}))`;

const likePattern = (word: string) => `%${word.replace(/[\\%_]/g, '\\$&')}%`;

function wordMatches(word: string): Prisma.Sql {
  return Prisma.sql`(${normalized(word)} <<% "nameNormalized" OR "nameNormalized" LIKE ${normalized(likePattern(word))})`;
}

function matchClause({ words, setIds }: CatalogSearch): Prisma.Sql {
  if (words.length === 0) return Prisma.sql`"setId" = ANY(${setIds}::text[])`;
  return Prisma.sql`(${Prisma.join(words.map(wordMatches), ' OR ')})`;
}

function orderClause({ words, phrase, setIds, sort }: CatalogSearch): Prisma.Sql {
  if (sort) return Prisma.sql`"nameNormalized" ${Prisma.raw(sort.order === 'desc' ? 'DESC' : 'ASC')}, id`;
  const bySet = Prisma.sql`"setId" = ANY(${setIds}::text[]) DESC`;
  if (words.length === 0) return Prisma.sql`${bySet}, "imageUrl" IS NULL, name, id`;
  const score = Prisma.join(words.map((word) => Prisma.sql`word_similarity(${normalized(word)}, "nameNormalized")`), ' + ');
  return Prisma.sql`${bySet}, (${score}) DESC, similarity(${normalized(phrase)}, "nameNormalized") DESC, "imageUrl" IS NULL, name, id`;
}

export class PrismaCatalogSearchStore implements CatalogSearchStore {
  constructor(private readonly db: Db) {}

  listSets(lang: string): Promise<CatalogSet[]> {
    return this.db.$queryRaw<CatalogSet[]>`
      SELECT DISTINCT "setId" AS id, "setName" AS name
      FROM "CatalogCard"
      WHERE lang = ${lang}
      ORDER BY "setId"`;
  }

  async matchingWords(lang: string, words: string[]): Promise<string[]> {
    const found = await Promise.all(
      words.map((word) =>
        this.db.$queryRaw<{ found: boolean }[]>`
          SELECT EXISTS (SELECT 1 FROM "CatalogCard" WHERE lang = ${lang} AND ${wordMatches(word)}) AS found`,
      ),
    );
    return words.filter((_, index) => found[index][0]?.found);
  }

  search(query: CatalogSearch): Promise<CatalogEntry[]> {
    const onlySet = query.onlySetId ? Prisma.sql`AND "setId" = ${query.onlySetId}` : Prisma.empty;
    return this.db.$queryRaw<CatalogEntry[]>`
      SELECT id, "localId", name, "setId", "setName", "imageUrl"
      FROM "CatalogCard"
      WHERE lang = ${query.lang} ${onlySet} AND ${matchClause(query)}
      ORDER BY ${orderClause(query)}
      LIMIT ${query.take} OFFSET ${query.offset}`;
  }

  async save(lang: string, cards: CatalogEntry[]): Promise<number> {
    if (cards.length === 0) return 0;
    return this.db.$executeRaw`
      INSERT INTO "CatalogCard" (id, lang, name, "nameNormalized", "localId", "setId", "setName", "imageUrl", "syncedAt")
      SELECT c.id, ${lang}, c.name, lower(unaccent(c.name)), c."localId", c."setId", c."setName", c."imageUrl", now()
      FROM unnest(
        ${cards.map((card) => card.id)}::text[],
        ${cards.map((card) => card.name)}::text[],
        ${cards.map((card) => card.localId)}::text[],
        ${cards.map((card) => card.setId)}::text[],
        ${cards.map((card) => card.setName)}::text[],
        ${cards.map((card) => card.imageUrl)}::text[]
      ) AS c(id, name, "localId", "setId", "setName", "imageUrl")
      ON CONFLICT (id, lang) DO UPDATE SET
        name = EXCLUDED.name,
        "nameNormalized" = EXCLUDED."nameNormalized",
        "localId" = EXCLUDED."localId",
        "setId" = EXCLUDED."setId",
        "setName" = EXCLUDED."setName",
        "imageUrl" = EXCLUDED."imageUrl",
        "syncedAt" = EXCLUDED."syncedAt"`;
  }
}
