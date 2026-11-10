import { findCardById, findCards } from '../repositories/cardRepository.js';
import { CardNotFoundError } from '../repositories/tcgdexRepository.js';
import { getUserCardInfo } from '../services/card.service.js';
import { listByCard } from '../services/listing.service.js';
import { AppError } from '../utils/AppError.js';


export async function getCardDetails(req, res, next) {
  try {
    const { id } = req.params;
    const lang = res.locals.lang;
    const userId = req.user?.id;
    const card = await findCardById(id, lang);
    const [user, listings] = await Promise.all([
      userId ? getUserCardInfo(userId, card.id) : Promise.resolve(null),
      listByCard(card.id),
    ]);

    res.set('Cache-Control', userId ? 'private, no-cache' : 'private, max-age=60');
    res.set('Vary', 'Authorization');
    return res.json({ success: true, data: { card, user, listings } });
  } catch (err) {
    if (err instanceof CardNotFoundError) return next(new AppError(404, err.message));
    return next(err);
  }

  
}

export async function listCards(req, res, next) {
  try {
    const { lang, name, page, limit } = res.locals.query;
    const cards = await findCards({ lang, name, page, limit });

    res.set('Cache-Control', 'public, max-age=300');
    return res.json({
      success: true,
      data: cards,
      pagination: { page, limit, hasNextPage: cards.length === limit },
    });
  } catch (err) {
    return next(err);
  }
}
