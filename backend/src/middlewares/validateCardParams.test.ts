import { jest } from '@jest/globals';
import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

import { cardListQuerySchema, validateCardListQuery } from './validateCardParams.js';

const parse = (query: Record<string, unknown>) => cardListQuerySchema.safeParse({ lang: 'en', ...query });

const fields = (query: Record<string, unknown>) => {
  const result = parse(query);
  return result.success ? [] : result.error.issues.map((issue) => issue.path.join('.'));
};

describe('cardListQuerySchema', () => {
  test('sem filtros: page 1, limit 20 e order asc', () => {
    expect(parse({}).data).toEqual({ lang: 'en', page: 1, limit: 20, order: 'asc' });
  });

  test('aceita os filtros e a ordenação', () => {
    const result = parse({ type: 'Fire', rarity: 'Rare Holo', set: 'sv03.5', category: 'Trainer', sort: 'name', order: 'desc' });

    expect(result.data).toMatchObject({ type: 'Fire', rarity: 'Rare Holo', set: 'sv03.5', category: 'Trainer', sort: 'name', order: 'desc' });
  });

  test.each(['recent', 'wanted', 'traded'])('aceita a ordenação %s', (sort) => {
    expect(parse({ sort, order: 'desc' }).data).toMatchObject({ sort, order: 'desc' });
    expect(parse({ sort }).data).toMatchObject({ sort, order: 'desc' });
    expect(parse({ sort, order: 'asc' }).data).toMatchObject({ sort, order: 'asc' });
  });

  test('aceita nomes com acento de outros idiomas', () => {
    expect(fields({ type: 'Psíquico', category: 'Pokémon' })).toEqual([]);
  });

  test.each([
    ['type', { type: 'Fire1' }],
    ['type', { type: 'x'.repeat(31) }],
    ['rarity', { rarity: 'x'.repeat(51) }],
    ['set', { set: 'base 1' }],
    ['set', { set: '../sets' }],
    ['category', { category: 'Monstro!' }],
    ['sort', { sort: 'price' }],
    ['order', { order: 'up' }],
  ])('%s inválido → erro no campo', (field, query) => {
    expect(fields(query)).toEqual([field]);
  });
});

describe('validateCardListQuery', () => {
  const run = (query: Record<string, unknown>) => {
    const res = { locals: {} } as Response;
    const next = jest.fn();
    validateCardListQuery({ query } as unknown as Request, res, next as unknown as NextFunction);
    return { locals: res.locals, next };
  };

  test('filtro vazio na URL conta como ausente', () => {
    const { locals, next } = run({ type: '', rarity: '', set: '', category: '', sort: '', order: '' });

    expect(locals.query).toEqual({ lang: 'en', page: 1, limit: 20, order: 'asc' });
    expect(next).toHaveBeenCalled();
  });

  test('filtro repetido na URL → ZodError', () => {
    expect(() => run({ type: ['Fire', 'Water'] })).toThrow(ZodError);
  });
});
