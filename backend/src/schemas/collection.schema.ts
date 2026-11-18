import { z } from 'zod';

import { CardCondition, CardFinish } from '../generated/prisma/index.js';
import { cardLangSchema } from '../middlewares/validateCardParams.js';
import { toPageRequest } from '../utils/pagination.js';
import {
  booleanFilter,
  conditionFilter,
  finishFilter,
  itemSortFilter,
  qFilter,
  setIdFilter,
  typeFilter,
} from './cardFilters.schema.js';
import { optionalPaginationQuery } from './pagination.schema.js';

const condition = z.enum(CardCondition);

export const createCollectionItemSchema = z
  .object({
    cardId: z.string().trim().min(1),
    quantity: z.number().int().min(1),
    condition: condition.optional(),
    finish: z.enum(CardFinish),
    firstEdition: z.boolean(),
    isPublic: z.boolean().optional(),
    lang: cardLangSchema,
  })
  .strict();

export const updateCollectionItemSchema = z
  .object({
    quantity: z.number().int().min(0),
    condition,
    isPublic: z.boolean(),
  })
  .partial()
  .strict()
  .refine((data) => Object.keys(data).length > 0, 'Envie ao menos um campo');

export const listCollectionQuerySchema = z
  .object({
    q: qFilter.optional(),
    condition: conditionFilter.optional(),
    finish: finishFilter.optional(),
    isPublic: booleanFilter('isPublic').optional(),
    setId: setIdFilter.optional(),
    type: typeFilter.optional(),
    sort: itemSortFilter.optional(),
    ...optionalPaginationQuery,
  })
  .transform((query) => toPageRequest(query));

export const listPublicCollectionQuerySchema = z
  .object({
    q: qFilter.optional(),
    type: typeFilter.optional(),
    ...optionalPaginationQuery,
  })
  .transform((query) => toPageRequest(query));

export const collectionItemIdSchema = z.object({ id: z.uuid() });

export type CreateCollectionItemInput = z.infer<typeof createCollectionItemSchema>;

export type UpdateCollectionItemInput = z.infer<typeof updateCollectionItemSchema>;
