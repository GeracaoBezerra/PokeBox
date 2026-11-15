import request from 'supertest';

import { bearer } from './support/flows.js';
import { loginSeedUser, registerUser, startTestApp, type TestApp, uniqueName } from './support/testApp.js';

let ctx: TestApp;

beforeAll(async () => {
  ctx = await startTestApp();
});

afterAll(() => ctx.close());

function newAccount() {
  const username = uniqueName('auth');
  return { username, name: 'Conta de Teste', email: `${username}@teste.dev`, password: 'senha-forte-123' };
}

describe('POST /auth/register', () => {
  test('cria a conta e devolve o token, sem o hash da senha', async () => {
    const account = newAccount();

    const res = await request(ctx.app).post('/auth/register').send(account);

    expect(res.status).toBe(201);
    expect(res.body.data.token).toEqual(expect.any(String));
    expect(res.body.data.user).toMatchObject({ username: account.username, email: account.email });
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|senha-forte-123/);
  });

  test('e-mail repetido → 409', async () => {
    const account = newAccount();
    await request(ctx.app).post('/auth/register').send(account).expect(201);

    const res = await request(ctx.app)
      .post('/auth/register')
      .send({ ...account, username: uniqueName('auth') });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  test('username repetido → 409', async () => {
    const res = await request(ctx.app)
      .post('/auth/register')
      .send({ ...newAccount(), username: 'ash' });

    expect(res.status).toBe(409);
  });

  test('senha curta → 400 com details', async () => {
    const res = await request(ctx.app)
      .post('/auth/register')
      .send({ ...newAccount(), password: '123' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.details).toEqual(expect.arrayContaining([expect.objectContaining({ field: 'password' })]));
  });
});

describe('POST /auth/login', () => {
  test('login certo devolve o token', async () => {
    const user = await registerUser(ctx.app);

    const res = await request(ctx.app).post('/auth/login').send({ email: user.email, password: user.password });

    expect(res.status).toBe(200);
    expect(res.body.data.token).toEqual(expect.any(String));
  });

  test('senha errada → 401', async () => {
    const user = await registerUser(ctx.app);

    const res = await request(ctx.app).post('/auth/login').send({ email: user.email, password: 'senha-errada-1' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test('e-mail que não existe → 401', async () => {
    const res = await request(ctx.app)
      .post('/auth/login')
      .send({ email: `${uniqueName('x')}@teste.dev`, password: 'qualquer-coisa' });

    expect(res.status).toBe(401);
  });
});

describe('rotas protegidas', () => {
  test('sem token → 401', async () => {
    const res = await request(ctx.app).get('/auth/me');

    expect(res.status).toBe(401);
  });

  test('token inválido → 401', async () => {
    const res = await request(ctx.app).get('/auth/me').set(bearer('nao-e-um-jwt'));

    expect(res.status).toBe(401);
  });

  test('GET /auth/admin-check: usuário comum → 403, admin → 200', async () => {
    const user = await registerUser(ctx.app);
    const adminToken = await loginSeedUser(ctx.app, 'admin');

    await request(ctx.app).get('/auth/admin-check').set(bearer(user)).expect(403);
    await request(ctx.app).get('/auth/admin-check').set(bearer(adminToken)).expect(200);
  });
});

describe('limite de tentativas', () => {
  let limited: TestApp;

  beforeAll(async () => {
    limited = await startTestApp({ AUTH_RATE_LIMIT: '2' });
  });

  afterAll(() => limited.close());

  test('depois do limite de senhas erradas, 429 com Retry-After; outro e-mail entra', async () => {
    const user = await registerUser(limited.app);
    const other = await registerUser(limited.app);
    const wrong = { email: user.email, password: 'senha-errada-1' };

    await request(limited.app).post('/auth/login').send(wrong).expect(401);
    await request(limited.app).post('/auth/login').send(wrong).expect(401);
    const blocked = await request(limited.app).post('/auth/login').send(wrong);

    expect(blocked.status).toBe(429);
    expect(blocked.headers['retry-after']).toBeDefined();
    await request(limited.app).post('/auth/login').send({ email: other.email, password: other.password }).expect(200);
  });
});
