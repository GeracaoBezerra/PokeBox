import { jest } from '@jest/globals';

const USER_ID = 'user-id';

const collectionRepository = { sumQuantityByUserAndCard: jest.fn(), findOwnersOfCards: jest.fn() };
const wishlistRepository = { create: jest.fn() };
const cardRepository = { upsertCard: jest.fn() };
const cardService = { fetchCard: jest.fn() };

jest.unstable_mockModule('../repositories/collectionRepository.js', () => collectionRepository);
jest.unstable_mockModule('../repositories/wishlistRepository.js', () => wishlistRepository);
jest.unstable_mockModule('../repositories/cardRepository.js', () => cardRepository);
jest.unstable_mockModule('./card.service.js', () => cardService);

const { add } = await import('./wishlist.service.js');

const card = { id: 'base1-2', name: 'Blastoise', number: '2', set: { id: 'base1', name: 'Base Set' } };

const savedItem = { id: 'wish-id', userId: USER_ID, cardId: 'base1-2', card: { id: 'base1-2', name: 'Blastoise' } };

beforeEach(() => {
  jest.clearAllMocks();
  cardService.fetchCard.mockResolvedValue(card);
  cardRepository.upsertCard.mockResolvedValue({});
  collectionRepository.findOwnersOfCards.mockResolvedValue([]);
  wishlistRepository.create.mockResolvedValue(savedItem);
});

describe('wishlist.service add (RN-12)', () => {
  test('carta que a pessoa já tem na coleção dá 409 e não grava', async () => {
    collectionRepository.sumQuantityByUserAndCard.mockResolvedValue(1);

    await expect(add(USER_ID, { cardId: 'BASE1-2' })).rejects.toMatchObject({
      statusCode: 409,
      message: 'Você já tem esta carta na sua coleção',
    });
    expect(collectionRepository.sumQuantityByUserAndCard).toHaveBeenCalledWith(USER_ID, 'base1-2');
    expect(cardRepository.upsertCard).not.toHaveBeenCalled();
    expect(wishlistRepository.create).not.toHaveBeenCalled();
  });

  test.each([
    ['quantidade zerada', 0],
    ['nenhum item', null],
  ])('%s deixa adicionar', async (_label, sum) => {
    collectionRepository.sumQuantityByUserAndCard.mockResolvedValue(sum);

    await add(USER_ID, { cardId: 'base1-2' });

    expect(wishlistRepository.create).toHaveBeenCalledWith({ userId: USER_ID, cardId: 'base1-2' });
  });

  test('carta repetida na wishlist continua dando 409', async () => {
    collectionRepository.sumQuantityByUserAndCard.mockResolvedValue(null);
    wishlistRepository.create.mockRejectedValue({ code: 'P2002' });

    await expect(add(USER_ID, { cardId: 'base1-2' })).rejects.toMatchObject({
      statusCode: 409,
      message: 'Esta carta já está na sua wishlist',
    });
  });
});
