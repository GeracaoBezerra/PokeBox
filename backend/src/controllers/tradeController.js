import * as tradeService from '../services/trade.service.js';
import { createTradeSchema, listTradesQuerySchema, tradeIdSchema } from '../schemas/trade.schema.js';

export async function create(req, res) {
  const { offerId } = createTradeSchema.parse(req.body);
  const trade = await tradeService.create(req.user.id, offerId);

  return res.status(201).json({ success: true, data: { trade } });
}

export async function listMine(req, res) {
  const { status } = listTradesQuerySchema.parse(req.query);
  const { sent, received } = await tradeService.listMine(req.user.id, status);

  return res.status(200).json({ success: true, data: { sent, received } });
}

export async function getById(req, res) {
  const { id } = tradeIdSchema.parse(req.params);
  const trade = await tradeService.getById(req.user.id, id);

  return res.status(200).json({ success: true, data: { trade } });
}

function action(run) {
  return async (req, res) => {
    const { id } = tradeIdSchema.parse(req.params);
    const trade = await run(req.user.id, id);

    return res.status(200).json({ success: true, data: { trade } });
  };
}

export const accept = action(tradeService.accept);
export const reject = action(tradeService.reject);
export const cancel = action(tradeService.cancel);
