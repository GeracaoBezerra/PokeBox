import { z } from 'zod';

import { LANGS } from '../middlewares/validateCardParams.js';
import { toPageRequest } from '../utils/pagination.js';
import { itemSortFilter, qFilter, rarityFilter, typeFilter } from './cardFilters.schema.js';
import { optionalPaginationQuery } from './pagination.schema.js';

export const addWishlistItemSchema = z
  .object({
    cardId: z.string().trim().min(1),
    lang: z.enum(LANGS, { message: 'Idioma inválido' }).default('en'),
  })
  .strict();

export const listWishlistQuerySchema = z
  .object({
    q: qFilter.optional(),
    type: typeFilter.optional(),
    rarity: rarityFilter.optional(),
    sort: itemSortFilter.optional(),
    ...optionalPaginationQuery,
  })
  .transform((query) => toPageRequest(query));

export const wishlistItemIdSchema = z.object({ id: z.uuid() });

export type AddWishlistItemInput = z.infer<typeof addWishlistItemSchema>;
