const USABLE_STATUSES = ['ACTIVE', 'PENDING_VERIFICATION'];

export function isAccountUsable(accountStatus) {
  return USABLE_STATUSES.includes(accountStatus);
}
