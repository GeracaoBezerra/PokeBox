import { levelFor, resolveRequestId } from './requestLogger.js';

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
