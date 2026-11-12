import { z } from 'zod';

import { TradeStatus } from '../generated/prisma/index.js';

export const createTradeSchema = z
  .object({
    offerId: z.uuid(),
  })
  .strict();

export const listTradesQuerySchema = z.object({
  status: z.enum(TradeStatus).optional(),
});

export const tradeIdSchema = z.object({ id: z.uuid() });
