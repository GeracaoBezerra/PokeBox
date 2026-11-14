import { z } from 'zod';

import { OfferStatus } from '../generated/prisma/index.js';

export const MAX_OFFER_ITEMS = 20;

const message = z
  .string()
  .trim()
  .max(500)
  .transform((value) => value || null);

const offerItem = z
  .object({
    collectionItemId: z.uuid(),
    quantity: z.number().int().min(1),
  })
  .strict();

export const createOfferSchema = z
  .object({
    quantity: z.number().int().min(1),
    message: message.optional(),
    items: z
      .array(offerItem)
      .min(1, 'Ofereça ao menos 1 carta da sua coleção')
      .max(MAX_OFFER_ITEMS, `Ofereça no máximo ${MAX_OFFER_ITEMS} cartas`)
      .refine(
        (items) => new Set(items.map((item) => item.collectionItemId)).size === items.length,
        'Cada carta da coleção só pode aparecer uma vez na oferta',
      ),
  })
  .strict();

export const updateOfferStatusSchema = z
  .object({
    status: z.enum(['ACCEPTED', 'REJECTED', 'CANCELED']),
  })
  .strict();

export const listOffersQuerySchema = z.object({
  status: z.enum(OfferStatus).optional(),
});

export const offerIdSchema = z.object({ id: z.uuid() });

export type CreateOfferInput = z.infer<typeof createOfferSchema>;

export type OfferStatusChange = z.infer<typeof updateOfferStatusSchema>['status'];
