import { findCardById } from '../repositories/cardRepository.js';
import { sumQuantityByUserAndCard } from '../repositories/collectionRepository.js';
import { existsActiveByUserAndCard } from '../repositories/listingRepository.js';
import { CardNotFoundError } from '../repositories/tcgdexRepository.js';
import { existsByUserAndCard } from '../repositories/wishlistRepository.js';
import { AppError } from '../errors/AppError.js';
import { toUserCardInfo } from '../utils/cardRecord.js';

export async function fetchCard(cardId) {
  try {
    return await findCardById(cardId, 'en');
  } catch (err) {
    if (err instanceof CardNotFoundError) throw new AppError(404, 'Carta não encontrada');
    throw err;
  }
}

export async function getUserCardInfo(userId, cardId) {
  const [quantity, wishlistItem, activeListing] = await Promise.all([
    sumQuantityByUserAndCard(userId, cardId),
    existsByUserAndCard(userId, cardId),
    existsActiveByUserAndCard(userId, cardId),
  ]);
  return toUserCardInfo({ quantity, wishlistItem, activeListing });
}
