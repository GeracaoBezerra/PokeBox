import { jest } from '@jest/globals';

const OWNER_ID = 'owner-id';
const LISTING_ID = 'listing-id';

const tx = { name: 'tx' };

const collectionRepository = { lockById: jest.fn() };
const listingRepository = {
  findById: jest.fn(),
  sumOpenByItem: jest.fn(),
  update: jest.fn(),
};
const offerRepository = {
  cancelOpenByListing: jest.fn(),
  lockAcceptedWithoutTrade: jest.fn(),
  cancelByIds: jest.fn(),
};

jest.unstable_mockModule('../repositories/legacyCollectionRepository.js', () => collectionRepository);
jest.unstable_mockModule('../repositories/listingRepository.js', () => listingRepository);
jest.unstable_mockModule('../repositories/offerRepository.js', () => offerRepository);
jest.unstable_mockModule('../repositories/transaction.js', () => ({
  withTransaction: (fn) => fn(tx),
}));

const { update } = await import('./listing.service.js');

const owner = { id: OWNER_ID, role: 'USER' };
const admin = { id: 'admin-id', role: 'ADMIN' };

const listing = {
  id: LISTING_ID,
  collectionItemId: 'item-id',
  quantity: 3,
  description: null,
  status: 'ACTIVE',
  createdAt: new Date(),
  updatedAt: new Date(),
  collectionItem: {
    id: 'item-id',
    userId: OWNER_ID,
    condition: 'NEAR_MINT',
    finish: 'HOLO',
    firstEdition: false,
    user: { username: 'ash', name: 'Ash' },
    card: { id: 'base1-4', name: 'Charizard', images: {}, set: { id: 'base1', name: 'Base' } },
  },
};

const accepted = [
  { id: 'pede-1', quantity: 1 },
  { id: 'pede-2', quantity: 2 },
];

beforeEach(() => {
  jest.clearAllMocks();
  collectionRepository.lockById.mockResolvedValue({ id: 'item-id', userId: OWNER_ID, quantity: 3, reservedQuantity: 0 });
  listingRepository.findById.mockResolvedValue(listing);
  listingRepository.sumOpenByItem.mockResolvedValue(0);
  listingRepository.update.mockResolvedValue(listing);
  offerRepository.lockAcceptedWithoutTrade.mockResolvedValue(accepted);
});

describe('update cancela ofertas aceitas sem troca', () => {
  it('fechar cancela as abertas e todas as aceitas', async () => {
    await update(owner, LISTING_ID, { status: 'CLOSED' });

    expect(offerRepository.cancelOpenByListing).toHaveBeenCalledWith(LISTING_ID, tx);
    expect(offerRepository.lockAcceptedWithoutTrade).toHaveBeenCalledWith(LISTING_ID, tx);
    expect(offerRepository.cancelByIds).toHaveBeenCalledWith(['pede-1', 'pede-2'], tx);
  });

  it('bloquear (ADMIN) cancela todas as aceitas', async () => {
    await update(admin, LISTING_ID, { status: 'BLOCKED' });

    expect(offerRepository.cancelByIds).toHaveBeenCalledWith(['pede-1', 'pede-2'], tx);
  });

  it('diminuir cancela só as aceitas que pedem mais do que a nova quantidade', async () => {
    await update(owner, LISTING_ID, { quantity: 1 });

    expect(offerRepository.cancelOpenByListing).not.toHaveBeenCalled();
    expect(offerRepository.cancelByIds).toHaveBeenCalledWith(['pede-2'], tx);
  });

  it('pausar não mexe nas aceitas', async () => {
    await update(owner, LISTING_ID, { status: 'PAUSED' });

    expect(offerRepository.lockAcceptedWithoutTrade).not.toHaveBeenCalled();
    expect(offerRepository.cancelByIds).not.toHaveBeenCalled();
  });

  it('mudar só a descrição não trava as aceitas', async () => {
    await update(owner, LISTING_ID, { description: 'troco por Blastoise' });

    expect(offerRepository.lockAcceptedWithoutTrade).not.toHaveBeenCalled();
    expect(offerRepository.cancelByIds).not.toHaveBeenCalled();
  });
});
