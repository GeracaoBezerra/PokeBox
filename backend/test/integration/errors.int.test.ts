import request from 'supertest';

import { bearer } from './support/flows.js';
import { registerUser, startTestApp, type TestApp } from './support/testApp.js';

let ctx: TestApp;

beforeAll(async () => {
  ctx = await startTestApp();
});

afterAll(() => ctx.close());

describe('erros no formato padrão', () => {
  test('JSON malformado → 400 "JSON inválido"', async () => {
    const user = await registerUser(ctx.app);

    const res = await request(ctx.app)
      .post('/collection')
      .set(bearer(user))
      .set('Content-Type', 'application/json')
      .send('{"cardId": ');

    expect(res.status).toBe(400);
    expect(res.body).toEqual(expect.objectContaining({ success: false, error: 'JSON inválido' }));
  });

  test('corpo acima de 100 KB → 413', async () => {
    const res = await request(ctx.app)
      .post('/auth/login')
      .send({ email: 'a@a.dev', password: 'x'.repeat(120 * 1024) });

    expect(res.status).toBe(413);
    expect(res.body.success).toBe(false);
  });

  test('rota que não existe → 404', async () => {
    const res = await request(ctx.app).get('/nao-existe');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  test('toda resposta traz x-request-id', async () => {
    const res = await request(ctx.app).get('/health');

    expect(res.headers['x-request-id']).toEqual(expect.any(String));
  });

  test('id que não é UUID → 400', async () => {
    const user = await registerUser(ctx.app);

    const res = await request(ctx.app).patch('/collection/abc').set(bearer(user)).send({ quantity: 1 });

    expect(res.status).toBe(400);
  });
});
