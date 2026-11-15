import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';

import express from 'express';

import { attemptKey, createAuthLimiter, TOO_MANY_ATTEMPTS } from './rateLimit.js';

async function startApp(limit: number) {
  const app = express();
  app.use(express.json());
  app.post('/login', createAuthLimiter(limit), (req, res) => {
    if (req.body.password === 'certa') return res.status(200).json({ success: true });
    return res.status(401).json({ success: false, error: 'E-mail ou senha inválidos' });
  });
  const server: Server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/login`;
  const login = (password: string, email = 'ash@pokebox.dev') =>
    fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password }) });
  return { server, login };
}

const stop = (server: Server) => {
  server.closeAllConnections();
  return new Promise((resolve) => server.close(resolve));
};

describe('createAuthLimiter', () => {
  it('depois do limite de tentativas erradas responde 429 no formato da API', async () => {
    const { server, login } = await startApp(3);

    const statuses = [];
    for (let i = 0; i < 3; i += 1) statuses.push((await login('errada')).status);
    const blocked = await login('errada');

    expect(statuses).toEqual([401, 401, 401]);
    expect(blocked.status).toBe(429);
    expect(await blocked.json()).toEqual({ success: false, error: TOO_MANY_ATTEMPTS });
    expect(blocked.headers.get('retry-after')).not.toBeNull();
    await stop(server);
  });

  it('login certo não conta, então quem acerta a senha nunca é bloqueado', async () => {
    const { server, login } = await startApp(2);

    for (let i = 0; i < 5; i += 1) expect((await login('certa')).status).toBe(200);
    expect((await login('errada')).status).toBe(401);

    await stop(server);
  });

  it('cada e-mail tem a própria conta: quem erra bloqueia só a si mesmo, não o resto do mesmo IP', async () => {
    const { server, login } = await startApp(2);

    await login('errada');
    await login('errada');
    expect((await login('errada')).status).toBe(429);
    expect((await login('errada', 'ASH@pokebox.dev ')).status).toBe(429);
    expect((await login('certa', 'misty@pokebox.dev')).status).toBe(200);
    expect((await login('errada', 'misty@pokebox.dev')).status).toBe(401);

    await stop(server);
  });

  it('com limite 0, não bloqueia nada', async () => {
    const { server, login } = await startApp(0);

    for (let i = 0; i < 5; i += 1) expect((await login('errada')).status).toBe(401);

    await stop(server);
  });
});

describe('attemptKey', () => {
  it('junta o IP com o e-mail em minúsculas e sem espaços', () => {
    expect(attemptKey({ ip: '10.0.0.1', body: { email: ' Ash@PokeBox.dev ' } })).toBe('10.0.0.1|ash@pokebox.dev');
  });

  it('sem e-mail no corpo, conta só pelo IP', () => {
    expect(attemptKey({ ip: '10.0.0.1', body: {} })).toBe('10.0.0.1|');
    expect(attemptKey({ ip: '10.0.0.1', body: undefined })).toBe('10.0.0.1|');
  });

  it('IPv6 conta pela faixa /56, para ninguém fugir trocando o fim do endereço', () => {
    expect(attemptKey({ ip: '2001:db8:abcd:1200::1', body: {} })).toBe(attemptKey({ ip: '2001:db8:abcd:12ff::9', body: {} }));
  });
});
