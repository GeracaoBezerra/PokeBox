import { jest } from '@jest/globals';
import type { NextFunction, Request, Response } from 'express';

import type { ErrorTranslator } from '../errors/ErrorTranslator.js';
import { createErrorHandler, notFoundHandler } from './errorHandler.js';

function fakeResponse() {
  const res = { statusCode: 0, body: undefined as unknown } as { statusCode: number; body: unknown };
  const response = {
    status(code: number) {
      res.statusCode = code;
      return response;
    },
    json(body: unknown) {
      res.body = body;
      return response;
    },
  };
  return { res, response: response as unknown as Response };
}

const req = { method: 'GET', originalUrl: '/nada' } as Request;
const next = jest.fn() as unknown as NextFunction;

const fixed = (statusCode: number, message: string, details?: unknown): ErrorTranslator => ({
  translate: () => (details === undefined ? { statusCode, message } : { statusCode, message, details }),
});
const never: ErrorTranslator = { translate: () => null };

describe('createErrorHandler', () => {
  it('usa o primeiro tradutor que reconhece o erro', () => {
    const handler = createErrorHandler([never, fixed(409, 'Registro duplicado'), fixed(500, 'nunca')]);
    const { res, response } = fakeResponse();

    handler(new Error('x'), req, response, next);

    expect(res.statusCode).toBe(409);
    expect(res.body).toEqual({ success: false, error: 'Registro duplicado' });
  });

  it('inclui details quando o tradutor devolve', () => {
    const handler = createErrorHandler([fixed(400, 'Dados inválidos', [{ field: 'email', message: 'x' }])]);
    const { res, response } = fakeResponse();

    handler(new Error('x'), req, response, next);

    expect(res.body).toEqual({ success: false, error: 'Dados inválidos', details: [{ field: 'email', message: 'x' }] });
  });

  it('erro que ninguém reconhece vira 500 e vai para o log', () => {
    const logger = { error: jest.fn() };
    const handler = createErrorHandler([never], logger);
    const { res, response } = fakeResponse();
    const err = new Error('boom');

    handler(err, req, response, next);

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ success: false, error: 'Erro interno do servidor' });
    expect(logger.error).toHaveBeenCalledWith('[erro inesperado]', err);
  });
});

describe('notFoundHandler', () => {
  it('devolve 404 com o método e a rota', () => {
    const { res, response } = fakeResponse();

    notFoundHandler(req, response);

    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({ success: false, error: 'Rota não encontrada: GET /nada' });
  });
});
