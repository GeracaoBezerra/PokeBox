import { isAllowedOrigin } from './cors.js';

const env = {
  CORS_ORIGIN: ['https://pokebox.vercel.app', 'http://localhost:5173'],
  CORS_ORIGIN_REGEX: '^https://pokebox-[a-z0-9-]+\\.vercel\\.app$',
};

describe('isAllowedOrigin', () => {
  it('aceita as origens da lista', () => {
    expect(isAllowedOrigin('https://pokebox.vercel.app', env)).toBe(true);
    expect(isAllowedOrigin('http://localhost:5173', env)).toBe(true);
  });

  it('aceita o preview da Vercel que bate com a regex', () => {
    expect(isAllowedOrigin('https://pokebox-git-feat-logo-geracaobezerra.vercel.app', env)).toBe(true);
  });

  it('recusa outro site da Vercel e origens fora da lista', () => {
    expect(isAllowedOrigin('https://outro-app.vercel.app', env)).toBe(false);
    expect(isAllowedOrigin('https://pokebox-falso.vercel.app.golpe.com', env)).toBe(false);
    expect(isAllowedOrigin('http://localhost:3001', env)).toBe(false);
  });

  it('sem regex, vale só a lista', () => {
    expect(isAllowedOrigin('https://pokebox-git-x.vercel.app', { CORS_ORIGIN: env.CORS_ORIGIN })).toBe(false);
  });
});
