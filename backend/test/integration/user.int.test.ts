import request from 'supertest';

import { acceptedOffer, addItem, bearer, confirmTrade, createListing, makeOffer, PROFESSOR_OAK } from './support/flows.js';
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

describe('DELETE /user/me com negociações', () => {
  test('com troca aberta (qualquer lado) → 409 e nada muda', async () => {
    const owner = await registerUser(ctx.app);
    const proposer = await registerUser(ctx.app);
    const { listing } = await acceptedOffer(ctx.app, owner, proposer);

    const asOwner = await request(ctx.app).delete('/user/me').set(bearer(owner));
    const asProposer = await request(ctx.app).delete('/user/me').set(bearer(proposer));
    const stillThere = await request(ctx.app).get(`/listings/${listing.id}`).set(bearer(owner));

    expect(asOwner.status).toBe(409);
    expect(asOwner.body.error).toBe('Conclua ou cancele suas trocas antes de desativar a conta.');
    expect(asProposer.status).toBe(409);
    expect(stillThere.body.data.listing.status).toBe('IN_TRADE');
  });

  test('sem troca aberta: cancela as ofertas feitas e recebidas e fecha os anúncios', async () => {
    const leaving = await registerUser(ctx.app);
    const other = await registerUser(ctx.app);
    const mine = await createListing(ctx.app, leaving, (await addItem(ctx.app, leaving)).id);
    const theirs = await createListing(ctx.app, other, (await addItem(ctx.app, other)).id);
    const oak = (user: typeof leaving) => addItem(ctx.app, user, { cardId: PROFESSOR_OAK, finish: 'NORMAL' });
    const received = await makeOffer(ctx.app, other, mine.id, [{ collectionItemId: (await oak(other)).id, quantity: 1 }]);
    const made = await makeOffer(ctx.app, leaving, theirs.id, [{ collectionItemId: (await oak(leaving)).id, quantity: 1 }]);

    await request(ctx.app).delete('/user/me').set(bearer(leaving)).expect(204);

    const offerOf = async (id: string) => (await request(ctx.app).get(`/offers/${id}`).set(bearer(other))).body.data.offer;
    const myListings = await ctx.container.infra.prisma.listing.findUnique({ where: { id: mine.id } });
    expect(await offerOf(received.id)).toMatchObject({ status: 'CANCELED', cancelReason: 'ACCOUNT_DEACTIVATED' });
    expect(await offerOf(made.id)).toMatchObject({ status: 'CANCELED', cancelReason: 'ACCOUNT_DEACTIVATED' });
    expect(myListings?.status).toBe('CLOSED');
  });

  test('depois de concluir a troca, a conta desativa', async () => {
    const owner = await registerUser(ctx.app);
    const proposer = await registerUser(ctx.app);
    const { tradeId } = await acceptedOffer(ctx.app, owner, proposer);
    await confirmTrade(ctx.app, owner, tradeId);
    await confirmTrade(ctx.app, proposer, tradeId);

    await request(ctx.app).delete('/user/me').set(bearer(proposer)).expect(204);
  });
});
