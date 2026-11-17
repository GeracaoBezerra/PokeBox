import { z } from 'zod';

export const mostWishedQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(24).default(8),
});
