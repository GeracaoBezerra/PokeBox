import type { RequestHandler } from 'express';

import { AppError } from '../errors/AppError.js';
import { CardNotFoundError } from '../errors/CardNotFoundError.js';
import type { CardDetailLocals, CardLangLocals, CardListLocals } from '../middlewares/validateCardParams.js';
import type { CardService } from '../services/CardService.js';

export interface CardListingsReader {
  listByCard(cardId: string): Promise<unknown[]>;
}

type CardDetailHandler = RequestHandler<{ id: string }, unknown, unknown, unknown, CardDetailLocals>;
type CardListHandler = RequestHandler<Record<string, string>, unknown, unknown, unknown, CardListLocals>;
type CardFiltersHandler = RequestHandler<Record<string, string>, unknown, unknown, unknown, CardLangLocals>;

export class CardController {
  constructor(
    private readonly cards: Pick<CardService, 'getById' | 'find' | 'getFilterOptions' | 'getUserCardInfo'>,
    private readonly listings: CardListingsReader,
  ) {}

  readonly getDetails: CardDetailHandler = async (req, res, next) => {
    try {
      const { id } = req.params;
      const { lang } = res.locals;
      const userId = req.user?.id;
      const card = await this.cards.getById(id, lang);
      const [user, listings] = await Promise.all([
        userId ? this.cards.getUserCardInfo(userId, card.id) : Promise.resolve(null),
        this.listings.listByCard(card.id),
      ]);

      res.set('Cache-Control', userId ? 'private, no-cache' : 'private, max-age=60');
      res.set('Vary', 'Authorization');
      res.json({ success: true, data: { card, user, listings } });
    } catch (err) {
      if (err instanceof CardNotFoundError) return next(new AppError(404, err.message));
      return next(err);
    }
  };

  readonly list: CardListHandler = async (req, res, next) => {
    try {
      const { lang, name, page, limit, type, rarity, set, category, sort, order } = res.locals.query;
      const { cards, hasNextPage, search } = await this.cards.find({
        lang,
        name,
        page,
        limit,
        filters: { type, rarity, set, category },
        sort: sort && { field: sort, order },
      });

      const dynamicRanking = sort === 'wanted' || sort === 'traded';
      res.set('Cache-Control', dynamicRanking ? 'public, no-cache' : 'public, max-age=300');
      res.json({
        success: true,
        data: cards,
        pagination: { page, limit, hasNextPage },
        ...(search && { search }),
      });
    } catch (err) {
      return next(err);
    }
  };

  readonly filters: CardFiltersHandler = async (_req, res, next) => {
    try {
      const options = await this.cards.getFilterOptions(res.locals.lang);

      res.set('Cache-Control', 'public, max-age=3600');
      res.json({ success: true, data: options });
    } catch (err) {
      return next(err);
    }
  };
}
