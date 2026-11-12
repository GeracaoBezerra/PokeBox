import { jest } from '@jest/globals';

const OWNER_ID = 'owner-id';
const PROPOSER_ID = 'proposer-id';
const TRADE_ID = 'trade-id';

const tx = { name: 'tx' };

const collectionRepository = {
  lockById: jest.fn(),
  reserve: jest.fn(),
  release: jest.fn(),
  transferOut: jest.fn(),
  addOrIncrement: jest.fn(),
  findIdsByKeys: jest.fn(),
};
const wishlistRepository = { removeByUserAndCard: jest.fn() };
const tradeRepository = {
  findById: jest.fn(),
  lockById: jest.fn(),
  updateStatus: jest.fn(),
};

jest.unstable_mockModule('../repositories/legacyCollectionRepository.js', () => collectionRepository);
jest.unstable_mockModule('../repositories/listingRepository.js', () => ({}));
jest.unstable_mockModule('../repositories/offerRepository.js', () => ({}));
jest.unstable_mockModule('../repositories/tradeRepository.js', () => tradeRepository);
jest.unstable_mockModule('../repositories/legacyWishlistRepository.js', () => wishlistRepository);
const lockInOrder = jest.fn(async (ids) => new Map(ids.map((id) => [id, items[id]])));

jest.unstable_mockModule('../repositories/transaction.js', () => ({
  withTransaction: (fn) => fn(tx),
  lockInOrder,
}));

const { accept } = await import('./trade.service.js');

const items = {
  'item-owner': { id: 'item-owner', userId: OWNER_ID, quantity: 1, reservedQuantity: 1 },
  'item-proposer': { id: 'item-proposer', userId: PROPOSER_ID, quantity: 1, reservedQuantity: 1 },
};

const tradeItem = (collectionItemId, fromUserId, toUserId) => ({
  collectionItemId,
  fromUserId,
  toUserId,
  cardId: 'base1-4',
  condition: 'NEAR_MINT',
  finish: 'HOLO',
  firstEdition: false,
  quantity: 1,
});

const trade = {
  id: TRADE_ID,
  status: 'PROPOSED',
  proposerId: PROPOSER_ID,
  recipientId: OWNER_ID,
  items: [tradeItem('item-owner', OWNER_ID, PROPOSER_ID), tradeItem('item-proposer', PROPOSER_ID, OWNER_ID)],
};

beforeEach(() => {
  jest.clearAllMocks();
  tradeRepository.findById.mockResolvedValue(trade);
  tradeRepository.lockById.mockResolvedValue(trade);
  collectionRepository.findIdsByKeys.mockResolvedValue([]);
});

describe('accept (RN-07)', () => {
  it('erro no meio da transferência é propagado e a troca não vira ACCEPTED', async () => {
    collectionRepository.transferOut.mockResolvedValueOnce({}).mockRejectedValueOnce(new Error('falha forçada'));

    await expect(accept(OWNER_ID, TRADE_ID)).rejects.toThrow('falha forçada');

    expect(collectionRepository.transferOut).toHaveBeenCalledTimes(2);
    expect(tradeRepository.updateStatus).not.toHaveBeenCalled();
  });

  it('revalida antes de mexer em qualquer item: item sem reserva dá 422 e nada é escrito', async () => {
    const original = items['item-proposer'];
    items['item-proposer'] = { ...original, reservedQuantity: 0 };

    try {
      await expect(accept(OWNER_ID, TRADE_ID)).rejects.toMatchObject({ statusCode: 422 });
    } finally {
      items['item-proposer'] = original;
    }

    expect(collectionRepository.transferOut).not.toHaveBeenCalled();
    expect(collectionRepository.addOrIncrement).not.toHaveBeenCalled();
    expect(wishlistRepository.removeByUserAndCard).not.toHaveBeenCalled();
    expect(tradeRepository.updateStatus).not.toHaveBeenCalled();
  });

  it('caminho feliz: tira de quem entrega, soma em quem recebe e conclui', async () => {
    tradeRepository.updateStatus.mockResolvedValue({
      ...trade,
      status: 'ACCEPTED',
      completedAt: new Date(),
      offerId: null,
      proposer: { username: 'misty', name: 'Misty' },
      recipient: { username: 'ash', name: 'Ash' },
      items: [],
    });

    const result = await accept(OWNER_ID, TRADE_ID);

    expect(collectionRepository.transferOut).toHaveBeenCalledWith('item-owner', 1, tx);
    expect(collectionRepository.transferOut).toHaveBeenCalledWith('item-proposer', 1, tx);
    expect(collectionRepository.addOrIncrement).toHaveBeenCalledWith(
      expect.objectContaining({ userId: PROPOSER_ID, cardId: 'base1-4', quantity: 1, isPublic: true }),
      tx,
    );
    expect(tradeRepository.updateStatus).toHaveBeenCalledWith(TRADE_ID, 'ACCEPTED', tx);
    expect(result.status).toBe('ACCEPTED');
  });

  it('trava também os itens de quem recebe que já existem, junto com os de quem entrega', async () => {
    collectionRepository.findIdsByKeys.mockResolvedValue(['item-dest']);
    tradeRepository.updateStatus.mockResolvedValue({
      ...trade,
      proposer: { username: 'misty', name: 'Misty' },
      recipient: { username: 'ash', name: 'Ash' },
      items: [],
    });

    await accept(OWNER_ID, TRADE_ID);

    expect(collectionRepository.findIdsByKeys).toHaveBeenCalledWith([
      expect.objectContaining({ userId: PROPOSER_ID, cardId: 'base1-4', condition: 'NEAR_MINT' }),
      expect.objectContaining({ userId: OWNER_ID, cardId: 'base1-4', condition: 'NEAR_MINT' }),
    ]);
    expect(lockInOrder).toHaveBeenCalledWith(['item-owner', 'item-proposer', 'item-dest'], tx);
  });

  it('RN-11: cada carta recebida sai da wishlist de quem recebe, na mesma transação', async () => {
    tradeRepository.updateStatus.mockResolvedValue({
      ...trade,
      proposer: { username: 'misty', name: 'Misty' },
      recipient: { username: 'ash', name: 'Ash' },
      items: [],
    });

    await accept(OWNER_ID, TRADE_ID);

    expect(wishlistRepository.removeByUserAndCard).toHaveBeenCalledTimes(2);
    expect(wishlistRepository.removeByUserAndCard).toHaveBeenCalledWith(PROPOSER_ID, 'base1-4', tx);
    expect(wishlistRepository.removeByUserAndCard).toHaveBeenCalledWith(OWNER_ID, 'base1-4', tx);
  });

  it('quem fez a oferta não pode aceitar: 403 antes de escrever', async () => {
    await expect(accept(PROPOSER_ID, TRADE_ID)).rejects.toMatchObject({ statusCode: 403 });
    expect(collectionRepository.transferOut).not.toHaveBeenCalled();
  });
});
