// backend/src/utils/accountStatus.js
const USABLE_STATUSES = ['ACTIVE', 'PENDING_VERIFICATION'];

export function isAccountUsable(accountStatus) {
  return USABLE_STATUSES.includes(accountStatus);
}

export function isPublicProfileVisible(user) {
  return Boolean(user) && !user.deletedAt && isAccountUsable(user.accountStatus);
}
