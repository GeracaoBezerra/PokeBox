import { buildContainer } from './container.js';
import { parseEnv } from './config/env.js';

const env = parseEnv({
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/pokebox',
  JWT_SECRET: 'um-segredo-bem-comprido',
});

describe('buildContainer', () => {
  it('cada módulo entrega as suas rotas', async () => {
    const container = buildContainer(env);
    const paths = container.modules.flatMap((module) => module.routes.map((route) => route.path));

    expect(paths.sort()).toEqual(
      ['/auth', '/cards', '/collection', '/listings', '/offers', '/trades', '/user', '/users', '/wishlist'].sort(),
    );

    await container.shutdown();
  });
});
