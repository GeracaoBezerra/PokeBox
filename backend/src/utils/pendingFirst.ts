import type { PageWindow } from './pagination.js';

export interface PendingFirstSource<T> {
  find(pending: boolean, window: Partial<PageWindow>): Promise<T[]>;
  countPending(): Promise<number>;
}

export async function pendingFirst<T>(source: PendingFirstSource<T>, { skip = 0, take }: Partial<PageWindow>): Promise<T[]> {
  if (take === undefined) {
    const [pending, others] = await Promise.all([source.find(true, {}), source.find(false, {})]);
    return [...pending, ...others].slice(skip);
  }

  const pendingTotal = await source.countPending();
  const pending = skip < pendingTotal ? await source.find(true, { skip, take }) : [];
  const missing = take - pending.length;
  if (missing <= 0) return pending;

  const others = await source.find(false, { skip: Math.max(0, skip - pendingTotal), take: missing });
  return [...pending, ...others];
}
