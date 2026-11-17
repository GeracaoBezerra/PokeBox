import { jest } from '@jest/globals';

import { MemoryCache } from './memoryCache.js';

describe('MemoryCache', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  test('get devolve o valor dentro do prazo e null depois', () => {
    jest.useFakeTimers({ now: 0 });
    const cache = new MemoryCache<string>(1000);
    cache.set('a', 'valor');

    expect(cache.get('a')).toBe('valor');
    jest.setSystemTime(1001);
    expect(cache.get('a')).toBeNull();
  });

  test('getStale devolve o valor mesmo vencido', () => {
    jest.useFakeTimers({ now: 0 });
    const cache = new MemoryCache<string>(1000);
    cache.set('a', 'valor');
    jest.setSystemTime(5000);

    expect(cache.get('a')).toBeNull();
    expect(cache.getStale('a')).toBe('valor');
    expect(cache.getStale('b')).toBeNull();
  });

  test('cheio, descarta o mais antigo', () => {
    const cache = new MemoryCache<number>(1000, 2);
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3);

    expect(cache.getStale('a')).toBeNull();
    expect(cache.get('b')).toBe(2);
    expect(cache.get('c')).toBe(3);
  });

  test('regravar uma chave não descarta outra', () => {
    const cache = new MemoryCache<number>(1000, 2);
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('b', 3);

    expect(cache.get('a')).toBe(1);
    expect(cache.get('b')).toBe(3);
  });
});
