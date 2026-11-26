import request from 'supertest';

import { addItem, PROFESSOR_OAK } from './support/flows.js';
import { registerUser, startTestApp, type TestApp } from './support/testApp.js';

let ctx: TestApp;

beforeAll(async () => {
  ctx = await startTestApp();
});

afterAll(() => ctx.close());

describe('GET /users', () => {
  beforeAll(async () => {
    const people = [
      { username: 'ipe', name: 'Zeca' },
      { username: 'ana_ipeteste', name: 'Ipê Rosa' },
      { username: 'bia', name: 'Ipê Rosa' },
      { username: 'ipeinativo', accountStatus: 'INACTIVE' },
      { username: 'ipesuspenso', accountStatus: 'SUSPENDED' },
      { username: 'ipependente', accountStatus: 'PENDING_VERIFICATION' },
      { username: 'ipeapagado', deletedAt: new Date() },
    ] as const;
    for (const person of people) {
      await ctx.container.infra.prisma.user.create({
        data: {
          name: 'Teste', accountStatus: 'ACTIVE', email: `${person.username}@busca.test`,
          passwordHash: 'teste', ...person,
        },
      });
    }
  });

  test('busca sem login, ignora caixa e acento, pagina contas utilizáveis e expõe só nome e username', async () => {
    const search = (page: number) => request(ctx.app).get('/users').query({ q: '  IPÊ  ', page, limit: 2 }).expect(200);
    expect((await search(1)).body).toEqual({
      success: true,
      data: { items: [{ username: 'ipe', name: 'Zeca' }, { username: 'ana_ipeteste', name: 'Ipê Rosa' }] },
      pagination: { page: 1, limit: 2, hasNextPage: true },
    });
    expect((await search(2)).body).toEqual({
      success: true, data: { items: [{ username: 'bia', name: 'Ipê Rosa' }] },
      pagination: { page: 2, limit: 2, hasNextPage: false },
    });
    expect((await search(3)).body.data.items).toEqual([]);
    const pendente = await request(ctx.app).get('/users').query({ q: 'ipependente' }).expect(200);
    expect(pendente.body.data.items).toEqual([{ username: 'ipependente', name: 'Teste' }]);
    const inativo = await request(ctx.app).get('/users').query({ q: 'ipeinativo' }).expect(200);
    expect(inativo.body.data.items).toEqual([]);
  });

  test('aceita um trecho do username e trata curingas SQL como texto literal', async () => {
    const match = await request(ctx.app).get('/users').query({ q: '_IPET' }).expect(200);
    expect(match.body.data.items).toEqual([{ username: 'ana_ipeteste', name: 'Ipê Rosa' }]);
  });

  test.each(['%', 'busca.test', '\u0301'])('não lista contas para %j', async (q) => {
    const empty = await request(ctx.app).get('/users').query({ q }).expect(200);
    expect(empty.body.data.items).toEqual([]);
  });

  test.each([{}, { q: ' ' }, { q: 'a'.repeat(51) }, { q: 'ash', page: 0 }, { q: 'ash', limit: 101 }])(
    'rejeita consulta inválida %j', async (query) => {
      await request(ctx.app).get('/users').query(query).expect(400);
    },
  );
});

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
