import { z } from 'zod';

import { cardLangSchema } from '../middlewares/validateCardParams.js';
import { CARD_ID_PATTERN } from '../utils/cardId.js';
import { toPageRequest } from '../utils/pagination.js';
import { itemSortFilter, qFilter, rarityFilter, typeFilter } from './cardFilters.schema.js';
import { optionalPaginationQuery } from './pagination.schema.js';

export const addWishlistItemSchema = z
  .object({
    cardId: z.string().trim().regex(CARD_ID_PATTERN, 'ID de carta inválido'),
    lang: cardLangSchema,
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
