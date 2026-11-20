export interface SeedIfEmptyDeps {
  countUsers: () => Promise<number>;
  runSeed: () => Promise<void>;
  log: (message: string) => void;
}

export type SeedIfEmptyResult = 'seeded' | 'skipped';

export async function seedIfEmpty({ countUsers, runSeed, log }: SeedIfEmptyDeps): Promise<SeedIfEmptyResult> {
  const users = await countUsers();

  if (users > 0) {
    log(`Seed pulado: o banco já tem ${users} usuário(s). Para rodar de novo: make seed ou npm run db:seed.`);
    return 'skipped';
  }

  log('Banco vazio: rodando o seed.');
  await runSeed();
  return 'seeded';
}
