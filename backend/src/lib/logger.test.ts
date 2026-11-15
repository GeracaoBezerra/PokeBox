import { createLogger } from './logger.js';

function capture() {
  const lines: Record<string, unknown>[] = [];
  return { lines, stream: { write: (line: string) => lines.push(JSON.parse(line)) } };
}

describe('createLogger', () => {
  it('nos testes fica em silêncio se ninguém pedir outro nível', () => {
    expect(createLogger({ NODE_ENV: 'test', LOG_LEVEL: undefined }).level).toBe('silent');
  });

  it('em produção usa info por padrão e respeita o LOG_LEVEL', () => {
    const { stream } = capture();
    expect(createLogger({ NODE_ENV: 'production', LOG_LEVEL: undefined }, stream).level).toBe('info');
    expect(createLogger({ NODE_ENV: 'production', LOG_LEVEL: 'debug' }, stream).level).toBe('debug');
  });

  it('em produção cada evento sai como uma linha de JSON', () => {
    const { lines, stream } = capture();
    createLogger({ NODE_ENV: 'production', LOG_LEVEL: undefined }, stream).info({ port: 3000 }, 'servidor no ar');

    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({ level: 30, port: 3000, msg: 'servidor no ar' });
  });

  it('esconde senha, token e o header Authorization', () => {
    const { lines, stream } = capture();
    createLogger({ NODE_ENV: 'production', LOG_LEVEL: undefined }, stream).info(
      {
        req: { headers: { authorization: 'Bearer abc', host: 'api' } },
        body: { email: 'ash@pokebox.dev', password: 'pokebox123' },
        data: { token: 'jwt' },
      },
      'teste',
    );

    expect(lines[0]).toMatchObject({
      req: { headers: { authorization: '[oculto]', host: 'api' } },
      body: { email: 'ash@pokebox.dev', password: '[oculto]' },
      data: { token: '[oculto]' },
    });
  });
});
