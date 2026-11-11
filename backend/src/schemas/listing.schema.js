import { z } from 'zod';

import { CardCondition, CardFinish, ListingStatus } from '../generated/prisma/index.js';
import { tokenize } from '../utils/cardSearch.js';
import { LISTING_SORTS } from '../utils/listingSearch.js';
import { usernameRule } from './user.schema.js';

const description = z
  .string()
  .trim()
  .max(500)
  .transform((value) => value || null);

export const createListingSchema = z
  .object({
    collectionItemId: z.uuid(),
    quantity: z.number().int().min(1),
    description: description.optional(),
  })
  .strict();

export const updateListingSchema = z
  .object({
    quantity: z.number().int().min(1),
    description: description.nullable(),
    status: z.enum(Object.values(ListingStatus)),
  })
  .partial()
  .strict()
  .refine((data) => Object.keys(data).length > 0, 'Envie ao menos um campo');

const upperEnum = (values, message) =>
  z.preprocess((value) => (typeof value === 'string' ? value.trim().toUpperCase() : value), z.enum(values, { message }));

export const listListingsQuerySchema = z.object({
  cardId: z
    .string()
    .regex(/^[a-zA-Z0-9.\-]+$/, 'ID de carta inválido')
    .optional(),
  username: usernameRule.optional(),
  q: z
    .string()
    .trim()
    .min(1, 'q não pode ser vazio')
    .max(50, 'q deve ter no máximo 50 caracteres')
    .refine(
      (value) => tokenize(value).some((word) => /[\p{L}\p{N}]/u.test(word)),
      'q precisa ter ao menos uma palavra com 2 letras ou números',
    )
    .optional(),
  condition: upperEnum(Object.values(CardCondition), `condition deve ser um de: ${Object.values(CardCondition).join(', ')}`).optional(),
  finish: upperEnum(Object.values(CardFinish), `finish deve ser um de: ${Object.values(CardFinish).join(', ')}`).optional(),
  firstEdition: z.enum(['true', 'false'], { message: 'firstEdition deve ser true ou false' }).transform((value) => value === 'true').optional(),
  setId: z
    .string()
    .regex(/^[a-zA-Z0-9.\-]+$/, 'ID de set inválido')
    .max(30, 'setId deve ter no máximo 30 caracteres')
    .optional(),
  type: z.string().trim().min(1, 'type não pode ser vazio').max(30, 'type deve ter no máximo 30 caracteres').optional(),
  rarity: z.string().trim().min(1, 'rarity não pode ser vazio').max(50, 'rarity deve ter no máximo 50 caracteres').optional(),
  sort: z.enum(LISTING_SORTS, { message: `sort deve ser um de: ${LISTING_SORTS.join(', ')}` }).default('recent'),
  page: z.coerce.number({ message: 'page deve ser um número' }).int().min(1, 'page mínima é 1').default(1),
  limit: z.coerce.number({ message: 'limit deve ser um número' }).int().min(1, 'limit mínimo é 1').max(100, 'limit máximo é 100').default(20),
});

export const listingIdSchema = z.object({ id: z.uuid() });
