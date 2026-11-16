import request from 'supertest';

import { bearer } from './support/flows.js';
import { registerUser, startTestApp, type TestApp } from './support/testApp.js';

let ctx: TestApp;

beforeAll(async () => {
  ctx = await startTestApp();
});

afterAll(() => ctx.close());

describe('PATCH /user/me', () => {
  test('edita o nome', async () => {
    const user = await registerUser(ctx.app);

    const res = await request(ctx.app).patch('/user/me').set(bearer(user)).send({ name: 'Nome Novo' });

    expect(res.status).toBe(200);
    expect(res.body.data.user.name).toBe('Nome Novo');
  });

  test('campo inválido → 400 com details', async () => {
    const user = await registerUser(ctx.app);

    const res = await request(ctx.app).patch('/user/me').set(bearer(user)).send({ name: 'x' });

    expect(res.status).toBe(400);
    expect(res.body.details).toEqual(expect.any(Array));
  });

  test('campo que não existe → 400', async () => {
    const user = await registerUser(ctx.app);

    const res = await request(ctx.app).patch('/user/me').set(bearer(user)).send({ role: 'ADMIN' });

    expect(res.status).toBe(400);
  });
});

describe('DELETE /user/me', () => {
  test('desativa a conta: 204, login depois → 403 e perfil público → 404', async () => {
    const user = await registerUser(ctx.app);

    await request(ctx.app).delete('/user/me').set(bearer(user)).expect(204);

    const login = await request(ctx.app).post('/auth/login').send({ email: user.email, password: user.password });
    expect(login.status).toBe(403);
    await request(ctx.app).get(`/users/${user.username}/collection`).expect(404);
  });
});
