import { z } from 'zod';

export const LANGS = ['en', 'pt', 'es', 'fr', 'de', 'it', 'ja'];

const LANG_ALIASES = { 'pt-br': 'pt' };

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

function normalizeLang(value) {
  const lang = String(value ?? 'en').toLowerCase();
  return LANG_ALIASES[lang] ?? lang;
}

export function validateCardParams(req, res, next) {
  const params = cardParamsSchema.safeParse(req.params);
  const query = cardQuerySchema.safeParse({ lang: normalizeLang(req.query.lang) });

  if (!params.success || !query.success) {
    const issues = [...(params.error?.issues ?? []), ...(query.error?.issues ?? [])];
    return res.status(400).json({ message: 'Parâmetros inválidos', errors: issues.map((i) => i.message) });
  }

  res.locals.lang = query.data.lang;
  next();
}

export function validateCardListQuery(req, res, next) {
  const query = cardListQuerySchema.safeParse({
    lang: normalizeLang(req.query.lang),
    name: req.query.name || undefined,
    page: req.query.page,
    limit: req.query.limit,
  });

  if (!query.success) {
    return res.status(400).json({ message: 'Parâmetros inválidos', errors: query.error.issues.map((i) => i.message) });
  }

  res.locals.query = query.data;
  next();
}
