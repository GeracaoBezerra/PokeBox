import { jest } from '@jest/globals';

import { seedIfEmpty } from './seedIfEmpty.js';

function deps(users: number) {
  const runSeed = jest.fn(async () => {});
  const messages: string[] = [];
  return { runSeed, messages, countUsers: async () => users, log: (message: string) => messages.push(message) };
}

describe('seedIfEmpty', () => {
  it('roda o seed quando o banco não tem nenhum usuário', async () => {
    const d = deps(0);

    await expect(seedIfEmpty(d)).resolves.toBe('seeded');
    expect(d.runSeed).toHaveBeenCalledTimes(1);
    expect(d.messages).toEqual(['Banco vazio: rodando o seed.']);
  });

  it('pula o seed quando o banco já tem usuários', async () => {
    const d = deps(3);

    await expect(seedIfEmpty(d)).resolves.toBe('skipped');
    expect(d.runSeed).not.toHaveBeenCalled();
    expect(d.messages).toEqual([
      'Seed pulado: o banco já tem 3 usuário(s). Para rodar de novo: make seed ou npm run db:seed.',
    ]);
  });

  it('repassa a falha do seed para quem chamou', async () => {
    const d = deps(0);
    d.runSeed.mockRejectedValueOnce(new Error('SEED_ADMIN_PASSWORD: variável obrigatória ausente'));

    await expect(seedIfEmpty(d)).rejects.toThrow('SEED_ADMIN_PASSWORD');
  });
});
