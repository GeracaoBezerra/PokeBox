export const ITEM_SORTS = ['name', 'recent'] as const;

export type ItemSort = (typeof ITEM_SORTS)[number];

const ITEM_ORDER_BY = {
  name: [{ card: { name: 'asc' } }, { createdAt: 'asc' }, { id: 'asc' }],
  recent: [{ createdAt: 'desc' }, { id: 'asc' }],
} as const;

export function itemOrderBy(sort: ItemSort = 'name') {
  return [...ITEM_ORDER_BY[sort]];
}
