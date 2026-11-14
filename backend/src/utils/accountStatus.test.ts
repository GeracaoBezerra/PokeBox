import { isAccountUsable, isPublicProfileVisible } from './accountStatus.js';

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

describe('isPublicProfileVisible', () => {
  it.each(['ACTIVE', 'PENDING_VERIFICATION'] as const)('mostra o perfil da conta %s', (accountStatus) => {
    expect(isPublicProfileVisible({ accountStatus, deletedAt: null })).toBe(true);
  });

  it.each(['INACTIVE', 'SUSPENDED'] as const)('esconde o perfil da conta %s', (accountStatus) => {
    expect(isPublicProfileVisible({ accountStatus, deletedAt: null })).toBe(false);
  });

  it('esconde o perfil de conta apagada', () => {
    expect(isPublicProfileVisible({ accountStatus: 'ACTIVE', deletedAt: new Date() })).toBe(false);
  });

  it('esconde quando o usuário não existe', () => {
    expect(isPublicProfileVisible(null)).toBe(false);
  });
});
