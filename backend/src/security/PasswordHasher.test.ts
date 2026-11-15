import { BcryptPasswordHasher } from './PasswordHasher.js';

describe('BcryptPasswordHasher', () => {
  const hasher = new BcryptPasswordHasher(4);

  it('gera um hash que não é a senha e confere a senha certa', async () => {
    const hash = await hasher.hash('senha-correta');

    expect(hash).not.toBe('senha-correta');
    await expect(hasher.compare('senha-correta', hash)).resolves.toBe(true);
  });

  it('recusa a senha errada', async () => {
    const hash = await hasher.hash('senha-correta');

    await expect(hasher.compare('outra-senha', hash)).resolves.toBe(false);
  });
});
