import { z } from 'zod';

import { ListingStatus } from '../generated/prisma/index.js';
import { usernameRule } from './user.schema.js';

const description = z.string().trim().max(500);

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

export const listListingsQuerySchema = z.object({
  cardId: z
    .string()
    .regex(/^[a-zA-Z0-9.\-]+$/, 'ID de carta inválido')
    .optional(),
  username: usernameRule.optional(),
  page: z.coerce.number({ message: 'page deve ser um número' }).int().min(1, 'page mínima é 1').default(1),
  limit: z.coerce.number({ message: 'limit deve ser um número' }).int().min(1).max(100, 'limit máximo é 100').default(20),
});

export const listingIdSchema = z.object({ id: z.uuid() });
