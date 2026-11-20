import type { RequestHandler } from 'express';
import { z, ZodError } from 'zod';

import { CARD_ID_PATTERN } from '../utils/cardId.js';

export const LANGS = ['en', 'pt', 'es', 'fr', 'de', 'it', 'ja'] as const;

export type Lang = (typeof LANGS)[number];

const LANG_ALIASES: Record<string, Lang> = { 'pt-br': 'pt' };

const cardParamsSchema = z.object({
  id: z.string().regex(CARD_ID_PATTERN, 'ID de carta inválido'),
});

const langSchema = z.enum(LANGS, { message: 'Idioma inválido' });

export const cardLangSchema = z.preprocess(normalizeLang, langSchema);

const cardQuerySchema = z.object({
  lang: langSchema,
});

const LETTERS = /^[\p{L} ]+$/u;

export const cardListQuerySchema = z.object({
  lang: langSchema,
  name: z.string().trim().min(1).max(50, 'Nome muito longo').optional(),
  page: z.coerce.number({ message: 'page deve ser um número' }).int().min(1, 'page mínima é 1').default(1),
  limit: z.coerce.number({ message: 'limit deve ser um número' }).int().min(1).max(100, 'limit máximo é 100').default(20),
  type: z.string().trim().max(30, 'Tipo muito longo').regex(LETTERS, 'Tipo inválido').optional(),
  rarity: z.string().trim().min(1).max(50, 'Raridade muito longa').optional(),
  set: z.string().max(30, 'Set muito longo').regex(CARD_ID_PATTERN, 'Set inválido').optional(),
  category: z.string().trim().max(30, 'Categoria muito longa').regex(LETTERS, 'Categoria inválida').optional(),
  sort: z.enum(['name', 'recent', 'wanted', 'traded'], {
    message: 'sort aceita name, recent, wanted ou traded',
  }).optional(),
  order: z.enum(['asc', 'desc'], { message: 'order aceita asc ou desc' }).optional(),
}).transform(({ order, ...query }) => ({
  ...query,
  order: order ?? (query.sort && query.sort !== 'name' ? 'desc' : 'asc'),
}));

export type CardListQueryParams = z.infer<typeof cardListQuerySchema>;

export interface CardDetailLocals {
  lang: Lang;
}

export interface CardListLocals {
  query: CardListQueryParams;
}

export interface CardLangLocals {
  lang: Lang;
}

function normalizeLang(value: unknown): string {
  const lang = String(value ?? 'en').toLowerCase();
  return LANG_ALIASES[lang] ?? lang;
}

export const validateCardParams: RequestHandler = (req, res, next) => {
  const params = cardParamsSchema.safeParse(req.params);
  const query = cardQuerySchema.safeParse({ lang: normalizeLang(req.query.lang) });

  if (!params.success || !query.success) {
    throw new ZodError([...(params.error?.issues ?? []), ...(query.error?.issues ?? [])]);
  }

  res.locals.lang = query.data.lang;
  next();
};

export const validateCardLangQuery: RequestHandler = (req, res, next) => {
  const query = cardQuerySchema.safeParse({ lang: normalizeLang(req.query.lang) });
  if (!query.success) {
    throw new ZodError(query.error.issues);
  }

  res.locals.lang = query.data.lang;
  next();
};

export const validateCardListQuery: RequestHandler = (req, res, next) => {
  const { name, type, rarity, set, category, sort, order } = req.query;
  const query = cardListQuerySchema.safeParse({
    lang: normalizeLang(req.query.lang),
    name: name || undefined,
    page: req.query.page,
    limit: req.query.limit,
    type: type || undefined,
    rarity: rarity || undefined,
    set: set || undefined,
    category: category || undefined,
    sort: sort || undefined,
    order: order || undefined,
  });

  if (!query.success) {
    throw new ZodError(query.error.issues);
  }

  res.locals.query = query.data;
  next();
};
