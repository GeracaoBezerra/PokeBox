import { isAccountUsable } from './accountStatus.js';

describe('isAccountUsable', () => {
  it.each(['ACTIVE', 'PENDING_VERIFICATION'])('libera a conta %s', (status) => {
    expect(isAccountUsable(status)).toBe(true);
  });

  it.each(['SUSPENDED', 'INACTIVE'])('bloqueia a conta %s', (status) => {
    expect(isAccountUsable(status)).toBe(false);
  });

  it('bloqueia status desconhecido', () => {
    expect(isAccountUsable('BANNED')).toBe(false);
    expect(isAccountUsable(undefined)).toBe(false);
  });
});
