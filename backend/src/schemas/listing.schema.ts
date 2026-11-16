import { z } from 'zod';

import { ListingStatus } from '../generated/prisma/index.js';
import { CARD_ID_PATTERN } from '../utils/cardId.js';
import { LISTING_SORTS } from '../utils/listingSearch.js';
import { toPageRequest } from '../utils/pagination.js';
import {
  booleanFilter,
  conditionFilter,
  finishFilter,
  qFilter,
  rarityFilter,
  setIdFilter,
  typeFilter,
} from './cardFilters.schema.js';
import { optionalPaginationQuery, paginationQuery } from './pagination.schema.js';
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
    status: z.enum(ListingStatus),
  })
  .partial()
  .strict()
  .refine((data) => Object.keys(data).length > 0, 'Envie ao menos um campo');

export const listListingsQuerySchema = z.object({
  cardId: z
    .string()
    .regex(CARD_ID_PATTERN, 'ID de carta inválido')
    .optional(),
  username: usernameRule.optional(),
  q: qFilter.optional(),
  condition: conditionFilter.optional(),
  finish: finishFilter.optional(),
  firstEdition: booleanFilter('firstEdition').optional(),
  setId: setIdFilter.optional(),
  type: typeFilter.optional(),
  rarity: rarityFilter.optional(),
  sort: z.enum(LISTING_SORTS, { message: `sort deve ser um de: ${LISTING_SORTS.join(', ')}` }).default('recent'),
  ...paginationQuery,
});

export const listMyListingsQuerySchema = z.object(optionalPaginationQuery).transform((query) => toPageRequest(query));

export const listingIdSchema = z.object({ id: z.uuid() });

export type CreateListingInput = z.infer<typeof createListingSchema>;

export type UpdateListingInput = z.infer<typeof updateListingSchema>;

export type ListListingsQuery = z.infer<typeof listListingsQuerySchema>;
