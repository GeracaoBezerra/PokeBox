// backend/src/utils/accountStatus.js
export const USABLE_STATUSES = ['ACTIVE', 'PENDING_VERIFICATION'];

export function isAccountUsable(accountStatus) {
  return USABLE_STATUSES.includes(accountStatus);
}

export function isPublicProfileVisible(user) {
  return Boolean(user) && !user.deletedAt && isAccountUsable(user.accountStatus);
}
