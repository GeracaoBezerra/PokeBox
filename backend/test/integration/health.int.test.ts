import request from 'supertest';

import { loginSeedUser, registerUser, startTestApp, type TestApp } from './support/testApp.js';

let ctx: TestApp;

beforeAll(async () => {
  ctx = await startTestApp();
});

afterAll(() => ctx.close());

describe('GET /health/ready', () => {
  test('responde 200 com o banco de teste no ar', async () => {
    const res = await request(ctx.app).get('/health/ready');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true, data: { status: 'ok', database: 'ok' } });
    expect(res.headers['x-request-id']).toEqual(expect.any(String));
  });
});

describe('TCGdex simulada', () => {
  test('GET /cards/:id devolve a carta do seed sem sair para a internet', async () => {
    const res = await request(ctx.app).get('/cards/base1-4');

    expect(res.status).toBe(200);
    expect(res.body.data.card).toMatchObject({ id: 'base1-4', name: 'Charizard', number: '4/102' });
  });

  test('TCGdex fora do ar vira 502', async () => {
    ctx.tcgdex.failWith(500);
    try {
      const res = await request(ctx.app).get('/cards/base1-2');
      expect(res.status).toBe(502);
      expect(res.body.success).toBe(false);
    } finally {
      ctx.tcgdex.failWith(null);
    }
  });
});

describe('usuários de teste', () => {
  test('cadastro cria um usuário novo que acessa rota protegida', async () => {
    const user = await registerUser(ctx.app);

    const res = await request(ctx.app).get('/auth/me').set('Authorization', `Bearer ${user.token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.user.username).toBe(user.username);
  });

  test('usuários do seed entram com a senha do .env.test', async () => {
    await expect(loginSeedUser(ctx.app, 'ash')).resolves.toEqual(expect.any(String));
    await expect(loginSeedUser(ctx.app, 'admin')).resolves.toEqual(expect.any(String));
  });
});
