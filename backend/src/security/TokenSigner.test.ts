import jwt from 'jsonwebtoken';

import { JwtTokenSigner } from './TokenSigner.js';

const SECRET = 'segredo-de-teste-com-16+';

describe('JwtTokenSigner', () => {
  it('assina com HS256 e coloca o id do usuário no sub', () => {
    const token = new JwtTokenSigner(SECRET, '1h').sign('u-ash');

    const payload = jwt.verify(token, SECRET, { algorithms: ['HS256'] });

    expect(payload).toMatchObject({ sub: 'u-ash' });
  });

  it('respeita o tempo de expiração recebido', () => {
    const token = new JwtTokenSigner(SECRET, '2h').sign('u-ash');

    const payload = jwt.decode(token);
    if (payload === null || typeof payload === 'string') throw new Error('token sem payload');

    expect((payload.exp ?? 0) - (payload.iat ?? 0)).toBe(2 * 60 * 60);
  });
});
