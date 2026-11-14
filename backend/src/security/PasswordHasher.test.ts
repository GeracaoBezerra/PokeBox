import { BcryptPasswordHasher } from './PasswordHasher.js';

describe('BcryptPasswordHasher', () => {
  const hasher = new BcryptPasswordHasher(4);

  it('gera um hash que não é a senha e confere a senha certa', async () => {
    const hash = await hasher.hash('pokebox123');

    expect(hash).not.toBe('pokebox123');
    await expect(hasher.compare('pokebox123', hash)).resolves.toBe(true);
  });

  it('recusa a senha errada', async () => {
    const hash = await hasher.hash('pokebox123');

    await expect(hasher.compare('outra-senha', hash)).resolves.toBe(false);
  });
});
