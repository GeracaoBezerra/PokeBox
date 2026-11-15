import { EnvValidationError, parseDatabaseEnv, parseEnv, parseSeedEnv } from './env.js';

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
      JWT_EXPIRES_IN: '1d',
      TCGDEX_BASE_URL: 'https://api.tcgdex.net/v2',
      USE_MOCK: false,
      CORS_ORIGIN: ['http://localhost:5173', 'http://localhost:8080'],
    });
  });

  it('converte a porta e USE_MOCK a partir de texto', () => {
    const env = parseEnv({ ...valid, PORT: '8080', USE_MOCK: 'true' });

    expect(env.PORT).toBe(8080);
    expect(env.USE_MOCK).toBe(true);
  });

  it('USE_MOCK=false continua falso', () => {
    expect(parseEnv({ ...valid, USE_MOCK: 'false' }).USE_MOCK).toBe(false);
  });

  it('variável vazia vale como ausente e usa o padrão', () => {
    const env = parseEnv({ ...valid, PORT: '', CORS_ORIGIN: '', CORS_ORIGIN_REGEX: '' });

    expect(env.PORT).toBe(3000);
    expect(env.CORS_ORIGIN).toEqual(['http://localhost:5173', 'http://localhost:8080']);
    expect(env.CORS_ORIGIN_REGEX).toBeUndefined();
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

  it('JWT_EXPIRES_IN aceita prazos como 1d, 12h e 30 minutes', () => {
    for (const value of ['1d', '12h', '30 minutes', '3600']) {
      expect(parseEnv({ ...valid, JWT_EXPIRES_IN: value }).JWT_EXPIRES_IN).toBe(value);
    }
  });

  it('JWT_EXPIRES_IN fora do formato é recusado', () => {
    expect(() => parseEnv({ ...valid, JWT_EXPIRES_IN: '1 dia' })).toThrow(
      'JWT_EXPIRES_IN: use um prazo como 1d, 12h ou 30m',
    );
  });
  it('CORS_ORIGIN vira lista, separada por vírgula', () => {
    const env = parseEnv({ ...valid, CORS_ORIGIN: 'https://pokebox.vercel.app, http://localhost:5173' });

    expect(env.CORS_ORIGIN).toEqual(['https://pokebox.vercel.app', 'http://localhost:5173']);
  });

  it('CORS_ORIGIN com algo que não é URL é recusado', () => {
    expect(() => parseEnv({ ...valid, CORS_ORIGIN: 'pokebox.vercel.app' })).toThrow('cada origem precisa ser uma URL');
  });

  it('CORS_ORIGIN_REGEX inválida é recusada', () => {
    expect(() => parseEnv({ ...valid, CORS_ORIGIN_REGEX: '^https://(pokebox' })).toThrow(
      'CORS_ORIGIN_REGEX: precisa ser uma expressão regular válida',
    );
  });
});

describe('parseDatabaseEnv', () => {
  it('só exige DATABASE_URL', () => {
    expect(parseDatabaseEnv({ DATABASE_URL: valid.DATABASE_URL, JWT_SECRET: 'curto' })).toEqual({
      DATABASE_URL: valid.DATABASE_URL,
    });
  });

  it('sem DATABASE_URL diz que falta', () => {
    expect(() => parseDatabaseEnv({})).toThrow('DATABASE_URL: variável obrigatória ausente');
  });
});

describe('parseSeedEnv', () => {
  const seed = {
    DATABASE_URL: valid.DATABASE_URL,
    SEED_ADMIN_PASSWORD: 'senha-do-admin',
    SEED_DEMO_PASSWORD: 'senha-da-demo',
  };

  it('exige DATABASE_URL e as duas senhas', () => {
    expect(parseSeedEnv(seed)).toEqual(seed);
  });

  it('sem as senhas diz quais faltam', () => {
    expect(() => parseSeedEnv({ DATABASE_URL: valid.DATABASE_URL })).toThrow(
      expect.objectContaining({
        problems: [
          'SEED_ADMIN_PASSWORD: variável obrigatória ausente',
          'SEED_DEMO_PASSWORD: variável obrigatória ausente',
        ],
      }),
    );
  });

  it('senhas vazias contam como ausentes e só aparecem uma vez', () => {
    expect(() => parseSeedEnv({ ...seed, SEED_ADMIN_PASSWORD: '', SEED_DEMO_PASSWORD: '' })).toThrow(
      expect.objectContaining({
        problems: [
          'SEED_ADMIN_PASSWORD: variável obrigatória ausente',
          'SEED_DEMO_PASSWORD: variável obrigatória ausente',
        ],
      }),
    );
  });

  it('recusa senha com menos de 8 caracteres', () => {
    expect(() => parseSeedEnv({ ...seed, SEED_DEMO_PASSWORD: 'curta' })).toThrow(
      'SEED_DEMO_PASSWORD: precisa ter pelo menos 8 caracteres',
    );
  });

  it('recusa a mesma senha para o admin e para a demo', () => {
    expect(() => parseSeedEnv({ ...seed, SEED_DEMO_PASSWORD: seed.SEED_ADMIN_PASSWORD })).toThrow(
      'SEED_DEMO_PASSWORD: precisa ser diferente de SEED_ADMIN_PASSWORD',
    );
  });
});
