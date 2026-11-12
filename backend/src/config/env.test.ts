import { EnvValidationError, parseEnv } from './env.js';

const valid = {
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/pokebox?schema=public',
  JWT_SECRET: 'um-segredo-bem-comprido',
};

describe('parseEnv', () => {
  it('aplica os valores padrão', () => {
    expect(parseEnv(valid)).toEqual({
      ...valid,
      NODE_ENV: 'development',
      PORT: 3000,
      BACKEND_PORT: undefined,
      JWT_EXPIRES_IN: '1d',
      TCGDEX_BASE_URL: 'https://api.tcgdex.net/v2',
      USE_MOCK: false,
    });
  });

  it('converte portas e USE_MOCK a partir de texto', () => {
    const env = parseEnv({ ...valid, PORT: '8080', BACKEND_PORT: '3001', USE_MOCK: 'true' });

    expect(env.PORT).toBe(8080);
    expect(env.BACKEND_PORT).toBe(3001);
    expect(env.USE_MOCK).toBe(true);
  });

  it('USE_MOCK=false continua falso', () => {
    expect(parseEnv({ ...valid, USE_MOCK: 'false' }).USE_MOCK).toBe(false);
  });

  it('variável vazia vale como ausente e usa o padrão', () => {
    const env = parseEnv({ ...valid, BACKEND_PORT: '', PORT: '' });

    expect(env.BACKEND_PORT).toBeUndefined();
    expect(env.PORT).toBe(3000);
  });

  it('sem JWT_SECRET e DATABASE_URL diz quais faltam', () => {
    expect(() => parseEnv({})).toThrow(EnvValidationError);

    try {
      parseEnv({});
    } catch (error) {
      expect((error as EnvValidationError).problems).toEqual([
        'DATABASE_URL: variável obrigatória ausente',
        'JWT_SECRET: variável obrigatória ausente',
      ]);
    }
  });

  it('JWT_SECRET curto é recusado', () => {
    expect(() => parseEnv({ ...valid, JWT_SECRET: 'curto' })).toThrow(
      'JWT_SECRET: precisa ter pelo menos 16 caracteres',
    );
  });
});
