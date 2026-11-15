import { isQuietRequest, levelFor, resolveRequestId } from './requestLogger.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

describe('resolveRequestId', () => {
  it('usa o id que veio no header', () => {
    expect(resolveRequestId('teste-123')).toBe('teste-123');
    expect(resolveRequestId(['abc', 'def'])).toBe('abc');
  });

  it('gera um id novo quando o header não veio', () => {
    expect(resolveRequestId(undefined)).toMatch(UUID);
    expect(resolveRequestId('')).toMatch(UUID);
  });

  it('ignora header com caracteres estranhos ou grande demais', () => {
    expect(resolveRequestId('linha\nfalsa')).toMatch(UUID);
    expect(resolveRequestId('a'.repeat(129))).toMatch(UUID);
  });
});

describe('levelFor', () => {
  it('2xx e 3xx são info, 4xx é warn e 5xx é error', () => {
    expect(levelFor(200)).toBe('info');
    expect(levelFor(304)).toBe('info');
    expect(levelFor(401)).toBe('warn');
    expect(levelFor(500)).toBe('error');
    expect(levelFor(200, new Error('x'))).toBe('error');
  });
});

describe('isQuietRequest', () => {
  it('deixa fora do log só as rotas de saúde e o preflight do CORS', () => {
    expect(isQuietRequest('GET', '/health')).toBe(true);
    expect(isQuietRequest('GET', '/health/ready')).toBe(true);
    expect(isQuietRequest('GET', '/health?x=1')).toBe(true);
    expect(isQuietRequest('OPTIONS', '/auth/login')).toBe(true);
  });

  it('o resto entra no log, mesmo começando com /health', () => {
    expect(isQuietRequest('GET', '/healthz')).toBe(false);
    expect(isQuietRequest('GET', '/health-xyz')).toBe(false);
    expect(isQuietRequest('GET', '/health/outra')).toBe(false);
    expect(isQuietRequest('POST', '/auth/login')).toBe(false);
  });
});
