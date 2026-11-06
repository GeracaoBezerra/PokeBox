import { findCardById } from '../repositories/cardRepository.js';
import { CardNotFoundError } from '../repositories/tcgdexRepository.js';
import { AppError } from '../utils/AppError.js';

export async function fetchCard(cardId) {
  try {
    return await findCardById(cardId, 'en');
  } catch (err) {
    if (err instanceof CardNotFoundError) throw new AppError(404, 'Carta não encontrada');
    throw err;
  }
}
