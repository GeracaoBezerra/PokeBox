import { z } from 'zod';

import { CardCondition, CardFinish } from '../generated/prisma/index.js';

const condition = z.enum(Object.values(CardCondition));

export const createCollectionItemSchema = z
  .object({
    cardId: z.string().trim().min(1),
    quantity: z.number().int().min(1),
    condition: condition.optional(),
    finish: z.enum(Object.values(CardFinish)),
    firstEdition: z.boolean(),
    isPublic: z.boolean().optional(),
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

export const collectionItemIdSchema = z.object({ id: z.uuid() });
