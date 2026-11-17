export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_LIMIT = 20;
export const MAX_PAGE_LIMIT = 100;

export const LIST_SIDES = ['sent', 'received'] as const;

export type ListSide = (typeof LIST_SIDES)[number];

export interface PageParams {
  page: number;
  limit: number;
}

export interface PageWindow {
  skip: number;
  take: number;
}

export interface Page<T> {
  items: T[];
  hasNextPage: boolean;
}

export interface OptionalPageQuery {
  page?: number;
  limit?: number;
}

export interface PageRequest<F> {
  filters: F;
  page: PageParams | null;
}

export function toSkipTake({ page, limit }: PageParams): PageWindow {
  return { skip: (page - 1) * limit, take: limit + 1 };
}

export function toPage<T>(rows: T[], { limit }: PageParams): Page<T> {
  return { items: rows.slice(0, limit), hasNextPage: rows.length > limit };
}

export function toPageRequest<T extends OptionalPageQuery>(
  query: T,
  passive: readonly string[] = [],
): PageRequest<Omit<T, 'page' | 'limit'>> {
  const { page, limit, ...filters } = query;
  const paginated = Object.entries(query).some(([key, value]) => value !== undefined && !passive.includes(key));

  return {
    filters,
    page: paginated ? { page: page ?? DEFAULT_PAGE, limit: limit ?? DEFAULT_PAGE_LIMIT } : null,
  };
}
