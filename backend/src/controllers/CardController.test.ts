import { jest } from '@jest/globals';
import express, { type ErrorRequestHandler } from 'express';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';

import { AppError } from '../errors/AppError.js';
import { CardNotFoundError } from '../errors/CardNotFoundError.js';
import { cardMock } from '../mocks/cardMock.js';
import { createCardRoutes } from '../routes/card.routes.js';
import type { CardService } from '../services/CardService.js';
import { CardController, type CardListingsReader } from './CardController.js';

type Cards = Pick<CardService, 'getById' | 'find' | 'getUserCardInfo'>;

const USER = { id: 'user-1' };

function setup() {
  const cards: jest.Mocked<Cards> = {
    getById: jest.fn<Cards['getById']>(async () => cardMock),
    find: jest.fn<Cards['find']>(async () => ({ cards: [], hasNextPage: false, search: null })),
    getUserCardInfo: jest.fn<Cards['getUserCardInfo']>(async () => ({ inCollection: 1, inWishlist: false, onTradeList: false })),
  };
  const listings: jest.Mocked<CardListingsReader> = { listByCard: jest.fn<CardListingsReader['listByCard']>(async () => []) };
  const auth = {
    optionalAuth: jest.fn<express.RequestHandler>((req, _res, next) => {
      if (req.headers.authorization) Object.assign(req, { user: USER });
      next();
    }),
  };
  const app = express();
  app.use('/cards', createCardRoutes(new CardController(cards, listings), auth));
  const onError: ErrorRequestHandler = (err, _req, res, _next) => {
    const status = err instanceof AppError ? err.statusCode : 400;
    res.status(status).json({ success: false, error: err.message });
  };
  app.use(onError);
  return { app, cards, listings };
}

async function request(app: express.Express, path: string, headers: Record<string, string> = {}) {
  const server: Server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  try {
    const { port } = server.address() as AddressInfo;
    const res = await fetch(`http://127.0.0.1:${port}${path}`, { headers });
    return { status: res.status, headers: res.headers, body: await res.json() };
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

describe('CardController', () => {
  test('detalhe sem login traz user null, listings e cache público curto', async () => {
    const { app, cards, listings } = setup();

    const res = await request(app, '/cards/base1-4?lang=pt-br');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: { card: cardMock, user: null, listings: [] } });
    expect(res.headers.get('cache-control')).toBe('private, max-age=60');
    expect(res.headers.get('vary')).toBe('Authorization');
    expect(cards.getById).toHaveBeenCalledWith('base1-4', 'pt');
    expect(cards.getUserCardInfo).not.toHaveBeenCalled();
    expect(listings.listByCard).toHaveBeenCalledWith('base1-4');
  });

  test('detalhe com login traz a situação do usuário e no-cache', async () => {
    const { app, cards } = setup();

    const res = await request(app, '/cards/base1-4', { Authorization: 'Bearer x' });

    expect(res.body.data.user).toEqual({ inCollection: 1, inWishlist: false, onTradeList: false });
    expect(res.headers.get('cache-control')).toBe('private, no-cache');
    expect(cards.getUserCardInfo).toHaveBeenCalledWith('user-1', 'base1-4');
  });

  test('carta inexistente vira 404 com a mensagem do catálogo', async () => {
    const { app, cards } = setup();
    cards.getById.mockRejectedValue(new CardNotFoundError('Carta naoexiste-999 não encontrada'));

    const res = await request(app, '/cards/naoexiste-999');

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Carta naoexiste-999 não encontrada');
  });

  test('lista devolve paginação, search quando houver e cache público', async () => {
    const { app, cards } = setup();
    cards.find.mockResolvedValue({ cards: [], hasNextPage: true, search: { name: 'charizard', sets: [], ignored: [] } });

    const res = await request(app, '/cards?name=charizard&page=2&limit=5');

    expect(res.body).toEqual({
      success: true,
      data: [],
      pagination: { page: 2, limit: 5, hasNextPage: true },
      search: { name: 'charizard', sets: [], ignored: [] },
    });
    expect(res.headers.get('cache-control')).toBe('public, max-age=300');
    expect(cards.find).toHaveBeenCalledWith({ lang: 'en', name: 'charizard', page: 2, limit: 5 });
  });

  test('lista sem search não manda o campo', async () => {
    const { app } = setup();

    const res = await request(app, '/cards');

    expect(res.body).not.toHaveProperty('search');
  });
});
