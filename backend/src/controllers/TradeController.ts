import type { RequestHandler } from 'express';

import { createTradeSchema, listTradesQuerySchema, tradeIdSchema } from '../schemas/trade.schema.js';
import type { TradeService, TradeView } from '../services/TradeService.js';
import { currentUser } from '../utils/currentUser.js';

export type TradeActions = Pick<TradeService, 'create' | 'listMine' | 'listMinePage' | 'getById' | 'accept' | 'reject' | 'cancel'>;

type TradeStep = (userId: string, id: string) => Promise<TradeView>;

export class TradeController {
  constructor(private readonly trades: TradeActions) {}

  create: RequestHandler = async (req, res) => {
    const { offerId } = createTradeSchema.parse(req.body);
    const trade = await this.trades.create(currentUser(req).id, offerId);

    res.status(201).json({ success: true, data: { trade } });
  };

  listMine: RequestHandler = async (req, res) => {
    const userId = currentUser(req).id;
    const {
      filters: { status, side },
      page,
    } = listTradesQuerySchema.parse(req.query);

    if (!side || !page) {
      const { sent, received } = await this.trades.listMine(userId, status);
      res.status(200).json({ success: true, data: { sent, received } });
      return;
    }

    const { items, hasNextPage } = await this.trades.listMinePage(userId, side, status, page);
    res.status(200).json({ success: true, data: { items }, pagination: { ...page, hasNextPage } });
  };

  getById: RequestHandler = async (req, res) => {
    const { id } = tradeIdSchema.parse(req.params);
    const trade = await this.trades.getById(currentUser(req).id, id);

    res.status(200).json({ success: true, data: { trade } });
  };

  accept: RequestHandler = this.respondWith((userId, id) => this.trades.accept(userId, id));

  reject: RequestHandler = this.respondWith((userId, id) => this.trades.reject(userId, id));

  cancel: RequestHandler = this.respondWith((userId, id) => this.trades.cancel(userId, id));

  private respondWith(run: TradeStep): RequestHandler {
    return async (req, res) => {
      const { id } = tradeIdSchema.parse(req.params);
      const trade = await run(currentUser(req).id, id);

      res.status(200).json({ success: true, data: { trade } });
    };
  }
}
