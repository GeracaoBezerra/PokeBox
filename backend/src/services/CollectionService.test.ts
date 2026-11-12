import { jest } from '@jest/globals';

import type { CardDetail } from '../cards/types.js';
import type { Card } from '../generated/prisma/index.js';
import type { Db } from '../lib/prisma.js';
import type { CollectionItemWithCard, LockedCollectionItem } from '../repositories/CollectionRepository.js';
import type { TransactionRunner } from '../repositories/TransactionRunner.js';
import type { WishlistRemover } from '../repositories/WishlistRepository.js';
import type { CreateCollectionItemInput } from '../schemas/collection.schema.js';
import type { CardFetcher } from './CardService.js';
import {
  CollectionService,
  type CollectionStore,
  type ItemListingCounter,
  type ItemOfferCounter,
} from './CollectionService.js';
import type { CardWriter } from './WishlistService.js';

const USER_ID = 'user-id';
const ITEM_ID = 'item-id';

const tx = { name: 'tx' } as unknown as Db;

const card = {
  id: 'base1-4',
  name: 'Charizard',
  number: '4',
  set: { id: 'base1', name: 'Base' },
  variants: { normal: false, reverse: false, holo: true, firstEdition: true },
} as CardDetail;

const input: CreateCollectionItemInput = {
  cardId: 'BASE1-4',
  condition: 'NEAR_MINT',
  finish: 'HOLO',
  firstEdition: false,
  quantity: 1,
};

const savedItem = {
  id: ITEM_ID,
  userId: USER_ID,
  cardId: 'base1-4',
  condition: 'NEAR_MINT',
  finish: 'HOLO',
  firstEdition: false,
  quantity: 1,
  reservedQuantity: 0,
  isPublic: true,
  createdAt: new Date('2026-11-01T00:00:00Z'),
  updatedAt: new Date('2026-11-01T00:00:00Z'),
  card: { id: 'base1-4', name: 'Charizard', marketPrice: null } as Card,
} satisfies CollectionItemWithCard;

class FakeRunner implements TransactionRunner {
  calls = 0;
  readonly seenBefore: number[] = [];

  constructor(private readonly probe: () => number) {}

  run<T>(work: (db: Db) => Promise<T>): Promise<T> {
    this.calls += 1;
    this.seenBefore.push(this.probe());
    return work(tx);
  }
}

const locked: LockedCollectionItem = {
  id: ITEM_ID,
  userId: USER_ID,
  cardId: 'base1-4',
  quantity: 0,
  reservedQuantity: 0,
  condition: 'NEAR_MINT',
};

function setup() {
  const collection = {
    findManyByUser: jest.fn<CollectionStore['findManyByUser']>(async () => [savedItem]),
    findById: jest.fn<CollectionStore['findById']>(async () => savedItem),
    addOrIncrement: jest.fn<CollectionStore['addOrIncrement']>(async () => savedItem),
    lockById: jest.fn<CollectionStore['lockById']>(async () => locked),
    update: jest.fn<CollectionStore['update']>(async () => ({ ...savedItem, quantity: 1 })),
    remove: jest.fn<CollectionStore['remove']>(async () => undefined),
  } satisfies CollectionStore;
  const wishlist = {
    removeByUserAndCard: jest.fn<WishlistRemover['removeByUserAndCard']>(async () => false),
  } satisfies WishlistRemover;
  const listings = {
    sumOpenByItem: jest.fn<ItemListingCounter['sumOpenByItem']>(async () => 0),
    countByItem: jest.fn<ItemListingCounter['countByItem']>(async () => ({ open: 0, total: 0 })),
  } satisfies ItemListingCounter;
  const offers = {
    countByItem: jest.fn<ItemOfferCounter['countByItem']>(async () => ({ open: 0, accepted: 0 })),
  } satisfies ItemOfferCounter;
  const cards = { fetchCard: jest.fn<CardFetcher['fetchCard']>(async () => card) } satisfies CardFetcher;
  const cardStore = { upsertCard: jest.fn<CardWriter['upsertCard']>(async () => savedItem.card) } satisfies CardWriter;
  const transactions = new FakeRunner(() => cardStore.upsertCard.mock.calls.length);

  const service = new CollectionService({ collection, wishlist, listings, offers, cards, cardStore, transactions });

  return { collection, wishlist, listings, offers, cards, cardStore, transactions, service };
}

describe('CollectionService.list', () => {
  it('devolve os itens com available e preço como número', async () => {
    const { collection, service } = setup();
    collection.findManyByUser.mockResolvedValue([{ ...savedItem, quantity: 3, reservedQuantity: 1 }]);

    const items = await service.list(USER_ID);

    expect(collection.findManyByUser).toHaveBeenCalledWith(USER_ID);
    expect(items[0]).toMatchObject({ id: ITEM_ID, available: 2, card: { marketPrice: null } });
  });
});

describe('CollectionService.add (RN-01 e RN-11)', () => {
  it('grava o item e limpa a wishlist na mesma transação, com o id resolvido da carta', async () => {
    const { transactions, collection, wishlist, service } = setup();

    await service.add(USER_ID, input);

    expect(transactions.calls).toBe(1);
    expect(collection.addOrIncrement).toHaveBeenCalledWith(
      expect.objectContaining({ userId: USER_ID, cardId: 'base1-4' }),
      tx,
    );
    expect(wishlist.removeByUserAndCard).toHaveBeenCalledWith(USER_ID, 'base1-4', tx);
  });

  it('carta que já existe soma a quantidade pelo addOrIncrement (RN-01)', async () => {
    const { collection, service } = setup();
    collection.addOrIncrement.mockResolvedValue({ ...savedItem, quantity: 3 });

    const { item } = await service.add(USER_ID, { ...input, quantity: 2 });

    expect(collection.addOrIncrement).toHaveBeenCalledWith(
      { ...input, quantity: 2, cardId: 'base1-4', userId: USER_ID },
      tx,
    );
    expect(item).toMatchObject({ quantity: 3, available: 3 });
  });

  it('grava a carta antes de abrir a transação', async () => {
    const { cardStore, transactions, service } = setup();

    await service.add(USER_ID, input);

    expect(cardStore.upsertCard).toHaveBeenCalledWith(expect.objectContaining({ id: 'base1-4', setId: 'base1' }));
    expect(transactions.seenBefore).toEqual([1]);
  });

  it('removedFromWishlist é true quando a carta estava na wishlist', async () => {
    const { wishlist, service } = setup();
    wishlist.removeByUserAndCard.mockResolvedValue(true);

    const result = await service.add(USER_ID, input);

    expect(result.removedFromWishlist).toBe(true);
    expect(result.item).toMatchObject({ id: ITEM_ID, available: 1 });
  });

  it('removedFromWishlist é false quando a carta não estava na wishlist', async () => {
    const { service } = setup();

    const result = await service.add(USER_ID, input);

    expect(result.removedFromWishlist).toBe(false);
  });

  it('se gravar o item falhar, a wishlist não é limpa e o erro sobe', async () => {
    const { collection, wishlist, service } = setup();
    collection.addOrIncrement.mockRejectedValue(new Error('falha forçada'));

    await expect(service.add(USER_ID, input)).rejects.toThrow('falha forçada');

    expect(wishlist.removeByUserAndCard).not.toHaveBeenCalled();
  });

  it('variante inexistente dá 422 antes de mexer na coleção ou na wishlist', async () => {
    const { transactions, wishlist, cardStore, service } = setup();

    await expect(service.add(USER_ID, { ...input, finish: 'REVERSE' })).rejects.toMatchObject({ statusCode: 422 });

    expect(transactions.calls).toBe(0);
    expect(cardStore.upsertCard).not.toHaveBeenCalled();
    expect(wishlist.removeByUserAndCard).not.toHaveBeenCalled();
  });
});

describe('CollectionService.update', () => {
  it('item inexistente dá 404', async () => {
    const { collection, service } = setup();
    collection.lockById.mockResolvedValue(null);

    await expect(service.update(USER_ID, ITEM_ID, { quantity: 1 })).rejects.toMatchObject({
      statusCode: 404,
      message: 'Item da coleção não encontrado',
    });
  });

  it('item de outra pessoa dá 403 (RN-02)', async () => {
    const { collection, service } = setup();
    collection.lockById.mockResolvedValue({ ...locked, userId: 'outra' });

    await expect(service.update(USER_ID, ITEM_ID, { quantity: 1 })).rejects.toMatchObject({ statusCode: 403 });
    expect(collection.update).not.toHaveBeenCalled();
  });

  it('quantidade abaixo da reservada dá 422 (RN-03)', async () => {
    const { collection, service } = setup();
    collection.lockById.mockResolvedValue({ ...locked, quantity: 3, reservedQuantity: 2 });

    await expect(service.update(USER_ID, ITEM_ID, { quantity: 1 })).rejects.toMatchObject({ statusCode: 422 });
    expect(collection.update).not.toHaveBeenCalled();
  });

  it('quantidade abaixo do anunciado dá 422 (RN-05)', async () => {
    const { collection, listings, service } = setup();
    collection.lockById.mockResolvedValue({ ...locked, quantity: 3 });
    listings.sumOpenByItem.mockResolvedValue(2);

    await expect(service.update(USER_ID, ITEM_ID, { quantity: 1 })).rejects.toMatchObject({ statusCode: 422 });
    expect(listings.sumOpenByItem).toHaveBeenCalledWith(ITEM_ID, tx);
  });

  it('mudar a condição de item em oferta dá 409', async () => {
    const { collection, offers, service } = setup();
    collection.lockById.mockResolvedValue({ ...locked, quantity: 1 });
    offers.countByItem.mockResolvedValue({ open: 1, accepted: 0 });

    await expect(service.update(USER_ID, ITEM_ID, { condition: 'MINT' })).rejects.toMatchObject({ statusCode: 409 });
    expect(collection.update).not.toHaveBeenCalled();
  });

  it('mesma condição não consulta ofertas nem anúncios', async () => {
    const { offers, listings, collection, service } = setup();

    await service.update(USER_ID, ITEM_ID, { condition: 'NEAR_MINT' });

    expect(offers.countByItem).not.toHaveBeenCalled();
    expect(listings.countByItem).not.toHaveBeenCalled();
    expect(collection.update).toHaveBeenCalledWith(ITEM_ID, { condition: 'NEAR_MINT' }, tx);
  });

  it('item zerado que volta a ter quantidade tira a carta da wishlist na mesma transação (RN-11)', async () => {
    const { wishlist, service } = setup();

    const item = await service.update(USER_ID, ITEM_ID, { quantity: 1 });

    expect(wishlist.removeByUserAndCard).toHaveBeenCalledWith(USER_ID, 'base1-4', tx);
    expect(item).toMatchObject({ quantity: 1, available: 1 });
  });

  it.each([
    ['item que já tinha quantidade', { ...locked, quantity: 2 }, { quantity: 3 }],
    ['item que continua zerado', locked, { quantity: 0 }],
    ['mudança sem quantidade', locked, { isPublic: false }],
  ])('%s não mexe na wishlist', async (_label, item, changes) => {
    const { collection, wishlist, service } = setup();
    collection.lockById.mockResolvedValue(item);

    await service.update(USER_ID, ITEM_ID, changes);

    expect(wishlist.removeByUserAndCard).not.toHaveBeenCalled();
  });
});

describe('CollectionService.remove', () => {
  it('item inexistente dá 404', async () => {
    const { collection, service } = setup();
    collection.findById.mockResolvedValue(null);

    await expect(service.remove(USER_ID, ITEM_ID)).rejects.toMatchObject({ statusCode: 404 });
  });

  it('item de outra pessoa dá 403', async () => {
    const { collection, service } = setup();
    collection.findById.mockResolvedValue({ ...savedItem, userId: 'outra' });

    await expect(service.remove(USER_ID, ITEM_ID)).rejects.toMatchObject({ statusCode: 403 });
    expect(collection.remove).not.toHaveBeenCalled();
  });

  it('item reservado em negociação dá 409', async () => {
    const { collection, service } = setup();
    collection.findById.mockResolvedValue({ ...savedItem, reservedQuantity: 1 });

    await expect(service.remove(USER_ID, ITEM_ID)).rejects.toMatchObject({ statusCode: 409 });
    expect(collection.remove).not.toHaveBeenCalled();
  });

  it('item com anúncio dá 409', async () => {
    const { listings, collection, service } = setup();
    listings.countByItem.mockResolvedValue({ open: 1, total: 1 });

    await expect(service.remove(USER_ID, ITEM_ID)).rejects.toMatchObject({
      statusCode: 409,
      message: 'Este item tem anúncio aberto. Feche o anúncio antes de remover o item',
    });
    expect(collection.remove).not.toHaveBeenCalled();
  });

  it('item em oferta aceita dá 409', async () => {
    const { offers, collection, service } = setup();
    offers.countByItem.mockResolvedValue({ open: 0, accepted: 1 });

    await expect(service.remove(USER_ID, ITEM_ID)).rejects.toMatchObject({ statusCode: 409 });
    expect(collection.remove).not.toHaveBeenCalled();
  });

  it('item livre é apagado', async () => {
    const { collection, service } = setup();

    await service.remove(USER_ID, ITEM_ID);

    expect(collection.remove).toHaveBeenCalledWith(ITEM_ID);
  });
});
