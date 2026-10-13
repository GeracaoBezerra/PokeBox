import { findCardById, findCards, findListingsByCard, findUserCardInfo } from '../repositories/cardRepository.js';
import { CardNotFoundError } from '../repositories/tcgdexRepository.js';


export async function getCardDetails(req, res, next) {
  try {
    const { id } = req.params;
    const lang = res.locals.lang;
    const userId = req.user?.id; 
    const [card, user, listings] = await Promise.all([
      findCardById(id, lang),
      userId ? findUserCardInfo(userId, id) : Promise.resolve(null),
      findListingsByCard(id),
    ]);

    res.set('Cache-Control', 'private, max-age=60');
    return res.json({ card, user, listings });
  } catch (err) {
    if (err instanceof CardNotFoundError) return res.status(404).json({ message: err.message });
    return next(err);
  }

  
}

export async function listCards(req, res, next) {
  try {
    const { lang, name, page, limit } = res.locals.query;
    const cards = await findCards({ lang, name, page, limit });

    res.set('Cache-Control', 'public, max-age=300');
    return res.json({
      data: cards,
      pagination: { page, limit, hasNextPage: cards.length === limit },
    });
  } catch (err) {
    return next(err);
  }
}
