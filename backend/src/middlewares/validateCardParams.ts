import type { RequestHandler } from 'express';
import { z, ZodError } from 'zod';

export const LANGS = ['en', 'pt', 'es', 'fr', 'de', 'it', 'ja'] as const;

export type Lang = (typeof LANGS)[number];

const LANG_ALIASES: Record<string, Lang> = { 'pt-br': 'pt' };

const cardParamsSchema = z.object({
  id: z.string().regex(/^[a-zA-Z0-9.\-]+$/, 'ID de carta inválido'),
});

const langSchema = z.enum(LANGS, { message: 'Idioma inválido' });

const cardQuerySchema = z.object({
  lang: langSchema,
});

const cardListQuerySchema = z.object({
  lang: langSchema,
  name: z.string().trim().min(1).max(50, 'Nome muito longo').optional(),
  page: z.coerce.number({ message: 'page deve ser um número' }).int().min(1, 'page mínima é 1').default(1),
  limit: z.coerce.number({ message: 'limit deve ser um número' }).int().min(1).max(100, 'limit máximo é 100').default(20),
});

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

export const validateCardListQuery: RequestHandler = (req, res, next) => {
  const query = cardListQuerySchema.safeParse({
    lang: normalizeLang(req.query.lang),
    name: req.query.name || undefined,
    page: req.query.page,
    limit: req.query.limit,
  });

  if (!query.success) {
    throw new ZodError(query.error.issues);
  }

  res.locals.query = query.data;
  next();
};
