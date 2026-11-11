import { jest } from '@jest/globals';

const USER_ID = 'user-id';

const tx = { name: 'tx' };

const collectionRepository = { addOrIncrement: jest.fn() };
const wishlistRepository = { removeByUserAndCard: jest.fn() };
const cardRepository = { upsertCard: jest.fn() };
const cardService = { fetchCard: jest.fn() };
const withTransaction = jest.fn((fn) => fn(tx));

jest.unstable_mockModule('../repositories/collectionRepository.js', () => collectionRepository);
jest.unstable_mockModule('../repositories/wishlistRepository.js', () => wishlistRepository);
jest.unstable_mockModule('../repositories/cardRepository.js', () => cardRepository);
jest.unstable_mockModule('../repositories/listingRepository.js', () => ({}));
jest.unstable_mockModule('../repositories/offerRepository.js', () => ({}));
jest.unstable_mockModule('../repositories/transaction.js', () => ({ withTransaction }));
jest.unstable_mockModule('./card.service.js', () => cardService);

const { add } = await import('./collection.service.js');

const card = {
  id: 'base1-4',
  name: 'Charizard',
  number: '4',
  set: { id: 'base1', name: 'Base' },
  variants: { holo: true, firstEdition: true },
};

const input = { cardId: 'BASE1-4', condition: 'NEAR_MINT', finish: 'HOLO', firstEdition: false, quantity: 1 };

const savedItem = {
  id: 'item-id',
  userId: USER_ID,
  cardId: 'base1-4',
  condition: 'NEAR_MINT',
  finish: 'HOLO',
  firstEdition: false,
  quantity: 1,
  reservedQuantity: 0,
  isPublic: true,
  card: { id: 'base1-4', name: 'Charizard', marketPrice: null },
};

beforeEach(() => {
  jest.clearAllMocks();
  cardService.fetchCard.mockResolvedValue(card);
  collectionRepository.addOrIncrement.mockResolvedValue(savedItem);
  wishlistRepository.removeByUserAndCard.mockResolvedValue(false);
});

describe('add (RN-11)', () => {
  it('grava o item e limpa a wishlist na mesma transação, com o id resolvido da carta', async () => {
    await add(USER_ID, input);

    expect(withTransaction).toHaveBeenCalledTimes(1);
    expect(collectionRepository.addOrIncrement).toHaveBeenCalledWith(
      expect.objectContaining({ userId: USER_ID, cardId: 'base1-4' }),
      tx,
    );
    expect(wishlistRepository.removeByUserAndCard).toHaveBeenCalledWith(USER_ID, 'base1-4', tx);
  });

  it('removedFromWishlist é true quando a carta estava na wishlist', async () => {
    wishlistRepository.removeByUserAndCard.mockResolvedValue(true);

    const result = await add(USER_ID, input);

    expect(result.removedFromWishlist).toBe(true);
    expect(result.item).toMatchObject({ id: 'item-id', available: 1 });
  });

  it('removedFromWishlist é false quando a carta não estava na wishlist', async () => {
    const result = await add(USER_ID, input);

    expect(result.removedFromWishlist).toBe(false);
  });

  it('se gravar o item falhar, a wishlist não é limpa e o erro sobe', async () => {
    collectionRepository.addOrIncrement.mockRejectedValue(new Error('falha forçada'));

    await expect(add(USER_ID, input)).rejects.toThrow('falha forçada');

    expect(wishlistRepository.removeByUserAndCard).not.toHaveBeenCalled();
  });

  it('variante inexistente dá 422 antes de mexer na coleção ou na wishlist', async () => {
    await expect(add(USER_ID, { ...input, finish: 'REVERSE' })).rejects.toMatchObject({ statusCode: 422 });

    expect(withTransaction).not.toHaveBeenCalled();
    expect(wishlistRepository.removeByUserAndCard).not.toHaveBeenCalled();
  });
});
