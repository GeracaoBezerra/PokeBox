import { z } from 'zod';

export const addWishlistItemSchema = z
  .object({
    cardId: z.string().trim().min(1),
  })
  .strict();

export const wishlistItemIdSchema = z.object({ id: z.uuid() });
