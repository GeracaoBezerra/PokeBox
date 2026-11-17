import { z } from 'zod';

import { TradeStatus } from '../generated/prisma/index.js';
import { toPageRequest } from '../utils/pagination.js';
import { sidePaginationQuery, sideRequiredToPaginate } from './pagination.schema.js';

export const createTradeSchema = z
  .object({
    offerId: z.uuid(),
  })
  .strict();

export const listTradesQuerySchema = z
  .object({
    status: z.enum(TradeStatus).optional(),
    ...sidePaginationQuery,
  })
  .refine(sideRequiredToPaginate.check, sideRequiredToPaginate.issue)
  .transform((query) => toPageRequest(query, ['status']));

export const tradeIdSchema = z.object({ id: z.uuid() });
