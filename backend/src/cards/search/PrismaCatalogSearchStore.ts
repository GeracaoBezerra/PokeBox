import { Prisma } from '../../generated/prisma/index.js';
import type { Db } from '../../lib/prisma.js';
import type { CardFilterValues } from '../types.js';
import type {
  CatalogAttributeFilters,
  CatalogEntry,
  CatalogSearch,
  CatalogSearchStore,
  CatalogSet,
} from './CatalogSearchStore.js';

export interface CatalogAttributes {
  id: string;
  types: string[];
  rarity: string | null;
  category: string | null;
}

const FILTER_KINDS: [keyof CardFilterValues, string][] = [
  ['types', 'type'],
  ['rarities', 'rarity'],
  ['categories', 'category'],
];

const normalized = (text: string) => Prisma.sql`lower(unaccent(${text}))`;

const likePattern = (word: string) => `%${word.replace(/[\\%_]/g, '\\$&')}%`;

function wordMatches(word: string): Prisma.Sql {
  return Prisma.sql`(${normalized(word)} <<% "nameNormalized" OR "nameNormalized" LIKE ${normalized(likePattern(word))})`;
}

function matchClause({ words, setIds }: CatalogSearch): Prisma.Sql {
  if (words.length === 0 && setIds.length === 0) return Prisma.sql`TRUE`;
  if (words.length === 0) return Prisma.sql`"setId" = ANY(${setIds}::text[])`;
  return Prisma.sql`(${Prisma.join(words.map(wordMatches), ' OR ')})`;
}

function attributeClause({ type, rarity, category }: CatalogAttributeFilters = {}): Prisma.Sql {
  const conditions = [
    type ? Prisma.sql`${type} = ANY(types)` : null,
    rarity ? Prisma.sql`rarity = ${rarity}` : null,
    category ? Prisma.sql`category = ${category}` : null,
  ].filter((condition): condition is Prisma.Sql => condition !== null);
  return conditions.length === 0 ? Prisma.empty : Prisma.sql`AND ${Prisma.join(conditions, ' AND ')}`;
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

  async listSets(lang: string): Promise<CatalogSet[]> {
    const ordered = await this.db.catalogSet.findMany({
      where: { lang },
      orderBy: { position: 'asc' },
      select: { id: true, name: true },
    });
    if (ordered.length > 0) return ordered;
    return this.db.$queryRaw<CatalogSet[]>`
      SELECT DISTINCT "setId" AS id, "setName" AS name
      FROM "CatalogCard"
      WHERE lang = ${lang}
      ORDER BY "setId"`;
  }

  async filterValues(lang: string): Promise<CardFilterValues | null> {
    const rows = await this.db.catalogFilterValue.findMany({ where: { lang }, orderBy: { value: 'asc' } });
    if (rows.length === 0) return null;
    const valuesOf = (kind: string) => rows.filter((row) => row.kind === kind).map((row) => row.value);
    return { types: valuesOf('type'), rarities: valuesOf('rarity'), categories: valuesOf('category') };
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
      WHERE lang = ${query.lang} ${onlySet} ${attributeClause(query.attributes)} AND ${matchClause(query)}
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

  async saveSets(lang: string, sets: CatalogSet[]): Promise<void> {
    if (sets.length === 0) return;
    const ids = sets.map((set) => set.id);
    await this.db.$executeRaw`
      INSERT INTO "CatalogSet" (id, lang, name, position)
      SELECT s.id, ${lang}, s.name, s.position - 1
      FROM unnest(${ids}::text[], ${sets.map((set) => set.name)}::text[]) WITH ORDINALITY AS s(id, name, position)
      ON CONFLICT (id, lang) DO UPDATE SET name = EXCLUDED.name, position = EXCLUDED.position`;
    await this.db.$executeRaw`DELETE FROM "CatalogSet" WHERE lang = ${lang} AND NOT (id = ANY(${ids}::text[]))`;
  }

  async saveAttributes(lang: string, cards: CatalogAttributes[]): Promise<number> {
    if (cards.length === 0) return 0;
    return this.db.$executeRaw`
      UPDATE "CatalogCard" AS cc SET
        types = string_to_array(c.types, '|'),
        rarity = c.rarity,
        category = c.category
      FROM unnest(
        ${cards.map((card) => card.id)}::text[],
        ${cards.map((card) => card.types.join('|'))}::text[],
        ${cards.map((card) => card.rarity)}::text[],
        ${cards.map((card) => card.category)}::text[]
      ) AS c(id, types, rarity, category)
      WHERE cc.lang = ${lang} AND cc.id = c.id`;
  }

  async saveFilterValues(lang: string, values: CardFilterValues): Promise<void> {
    const rows = FILTER_KINDS.flatMap(([list, kind]) => values[list].map((value) => ({ kind, value })));
    if (rows.length === 0) return;
    const kinds = rows.map((row) => row.kind);
    const valueList = rows.map((row) => row.value);
    await this.db.$executeRaw`
      INSERT INTO "CatalogFilterValue" (lang, kind, value)
      SELECT ${lang}, v.kind, v.value FROM unnest(${kinds}::text[], ${valueList}::text[]) AS v(kind, value)
      ON CONFLICT DO NOTHING`;
    await this.db.$executeRaw`
      DELETE FROM "CatalogFilterValue" AS f
      WHERE f.lang = ${lang}
        AND NOT EXISTS (
          SELECT 1 FROM unnest(${kinds}::text[], ${valueList}::text[]) AS v(kind, value)
          WHERE v.kind = f.kind AND v.value = f.value
        )`;
  }
}
