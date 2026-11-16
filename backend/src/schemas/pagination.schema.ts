import { z } from 'zod';

import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_LIMIT,
  LIST_SIDES,
  MAX_PAGE_LIMIT,
  type ListSide,
  type OptionalPageQuery,
} from '../utils/pagination.js';

const page = z.coerce.number({ message: 'page deve ser um número' }).int().min(1, 'page mínima é 1');

const limit = z.coerce
  .number({ message: 'limit deve ser um número' })
  .int()
  .min(1, 'limit mínimo é 1')
  .max(MAX_PAGE_LIMIT, `limit máximo é ${MAX_PAGE_LIMIT}`);

export const paginationQuery = {
  page: page.default(DEFAULT_PAGE),
  limit: limit.default(DEFAULT_PAGE_LIMIT),
};

export const optionalPaginationQuery = {
  page: page.optional(),
  limit: limit.optional(),
};

export const sidePaginationQuery = {
  side: z.enum(LIST_SIDES, { message: `side deve ser um de: ${LIST_SIDES.join(', ')}` }).optional(),
  ...optionalPaginationQuery,
};

export const sideRequiredToPaginate = {
  check: (query: { side?: ListSide } & OptionalPageQuery) =>
    query.side !== undefined || (query.page === undefined && query.limit === undefined),
  issue: { message: `Informe side (${LIST_SIDES.join(' ou ')}) para usar page ou limit`, path: ['side'] },
};
