import request from 'supertest';

import { addItem, PROFESSOR_OAK } from './support/flows.js';
import { registerUser, startTestApp, type TestApp } from './support/testApp.js';

let ctx: TestApp;

beforeAll(async () => {
  ctx = await startTestApp();
});

afterAll(() => ctx.close());

describe('GET /users/:username/collection (RN-10)', () => {
  test('mostra só os itens públicos, sem e-mail nem reserva', async () => {
    const user = await registerUser(ctx.app);
    const visible = await addItem(ctx.app, user);
    const hidden = await addItem(ctx.app, user, { cardId: PROFESSOR_OAK, finish: 'NORMAL', isPublic: false });

    const res = await request(ctx.app).get(`/users/${user.username}/collection`);
    const ids = JSON.stringify(res.body);

    expect(res.status).toBe(200);
    expect(ids).toContain(visible.id);
    expect(ids).not.toContain(hidden.id);
    expect(ids).not.toContain(user.email);
    expect(ids).not.toMatch(/reserved/);
  });

  test('usuário que não existe → 404', async () => {
    await request(ctx.app).get('/users/ninguem_aqui_123/collection').expect(404);
  });

  test('perfil do seed responde sem login', async () => {
    const res = await request(ctx.app).get('/users/ash/collection');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
