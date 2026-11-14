import type { AccountStatus } from '../generated/prisma/index.js';

export const USABLE_STATUSES: AccountStatus[] = ['ACTIVE', 'PENDING_VERIFICATION'];

export interface ProfileVisibility {
  accountStatus: AccountStatus;
  deletedAt: Date | null;
}

export function isAccountUsable(accountStatus: string | null | undefined): boolean {
  return USABLE_STATUSES.some((status) => status === accountStatus);
}

export function isPublicProfileVisible<T extends ProfileVisibility>(user: T | null | undefined): user is T {
  return user != null && !user.deletedAt && isAccountUsable(user.accountStatus);
}
