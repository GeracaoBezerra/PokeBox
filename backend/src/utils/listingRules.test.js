import {
  assertListingQuantity,
  assertListingUpdate,
  isListingVisible,
  needsStockCheck,
  toListingResponse,
} from './listingRules.js';

const statusOf = (fn) => {
  try {
    fn();
  } catch (err) {
    return err.statusCode;
  }
  return null;
};

describe('assertListingQuantity', () => {
  it('aceita quando cabe exatamente no disponível', () => {
    expect(() => assertListingQuantity({ requested: 4, otherListed: 0, available: 4 })).not.toThrow();
  });

  it('recusa com 422 quando passa por 1', () => {
    expect(statusOf(() => assertListingQuantity({ requested: 5, otherListed: 0, available: 4 }))).toBe(422);
  });

  it('considera a reserva, que já vem descontada do disponível', () => {
    const available = 4 - 3;
    expect(statusOf(() => assertListingQuantity({ requested: 2, otherListed: 0, available }))).toBe(422);
    expect(() => assertListingQuantity({ requested: 1, otherListed: 0, available })).not.toThrow();
  });

  it('soma os outros anúncios do mesmo item', () => {
    expect(() => assertListingQuantity({ requested: 2, otherListed: 2, available: 4 })).not.toThrow();
    expect(statusOf(() => assertListingQuantity({ requested: 3, otherListed: 2, available: 4 }))).toBe(422);
  });
});

describe('assertListingUpdate', () => {
  const owner = { isOwner: true, isAdmin: false };
  const admin = { isOwner: false, isAdmin: true };
  const stranger = { isOwner: false, isAdmin: false };

  it.each([
    ['ACTIVE', { status: 'PAUSED' }],
    ['PAUSED', { status: 'ACTIVE' }],
    ['ACTIVE', { status: 'CLOSED' }],
    ['PAUSED', { status: 'CLOSED' }],
    ['ACTIVE', { quantity: 2, description: 'troco' }],
  ])('dono em %s pode enviar %o', (from, input) => {
    expect(() => assertListingUpdate({ from, input, ...owner })).not.toThrow();
  });

  it('outro usuário recebe 403', () => {
    expect(statusOf(() => assertListingUpdate({ from: 'ACTIVE', input: { quantity: 1 }, ...stranger }))).toBe(403);
  });

  it.each([owner, admin])('anúncio CLOSED é final: 422 (%o)', (who) => {
    expect(statusOf(() => assertListingUpdate({ from: 'CLOSED', input: { status: 'BLOCKED' }, ...who }))).toBe(422);
  });

  it('dono não mexe em anúncio BLOCKED', () => {
    expect(statusOf(() => assertListingUpdate({ from: 'BLOCKED', input: { status: 'ACTIVE' }, ...owner }))).toBe(403);
  });

  it('dono não pode pôr BLOCKED', () => {
    expect(statusOf(() => assertListingUpdate({ from: 'ACTIVE', input: { status: 'BLOCKED' }, ...owner }))).toBe(403);
  });

  it.each(['ACTIVE', 'PAUSED'])('admin bloqueia anúncio %s', (from) => {
    expect(() => assertListingUpdate({ from, input: { status: 'BLOCKED' }, ...admin })).not.toThrow();
  });

  it('admin desbloqueia para PAUSED', () => {
    expect(() => assertListingUpdate({ from: 'BLOCKED', input: { status: 'PAUSED' }, ...admin })).not.toThrow();
  });

  it.each([
    ['BLOCKED', 'ACTIVE'],
    ['BLOCKED', 'CLOSED'],
    ['ACTIVE', 'PAUSED'],
    ['ACTIVE', 'CLOSED'],
  ])('admin de %s para %s recebe 422', (from, status) => {
    expect(statusOf(() => assertListingUpdate({ from, input: { status }, ...admin }))).toBe(422);
  });

  it.each([{ quantity: 1 }, { description: 'x' }, { status: 'BLOCKED', quantity: 1 }])(
    'admin não muda quantidade nem descrição de outro: 403 (%o)',
    (input) => {
      expect(statusOf(() => assertListingUpdate({ from: 'ACTIVE', input, ...admin }))).toBe(403);
    },
  );
});

describe('needsStockCheck', () => {
  it('confere quando a quantidade aumenta', () => {
    expect(needsStockCheck({ status: 'ACTIVE', quantity: 1 }, { status: 'ACTIVE', quantity: 2 })).toBe(true);
  });

  it('não confere quando a quantidade diminui ou fica igual', () => {
    expect(needsStockCheck({ status: 'ACTIVE', quantity: 2 }, { status: 'ACTIVE', quantity: 1 })).toBe(false);
    expect(needsStockCheck({ status: 'ACTIVE', quantity: 2 }, { status: 'PAUSED', quantity: 2 })).toBe(false);
    expect(needsStockCheck({ status: 'PAUSED', quantity: 2 }, { status: 'ACTIVE', quantity: 2 })).toBe(false);
  });

  it('confere quando sai de BLOCKED', () => {
    expect(needsStockCheck({ status: 'BLOCKED', quantity: 2 }, { status: 'PAUSED', quantity: 2 })).toBe(true);
  });

  it('não confere quando fecha ou bloqueia', () => {
    expect(needsStockCheck({ status: 'ACTIVE', quantity: 1 }, { status: 'CLOSED', quantity: 9 })).toBe(false);
    expect(needsStockCheck({ status: 'ACTIVE', quantity: 1 }, { status: 'BLOCKED', quantity: 1 })).toBe(false);
  });
});

const listing = {
  id: 'listing-1',
  collectionItemId: 'item-1',
  quantity: 1,
  description: 'troco por Blastoise',
  status: 'ACTIVE',
  createdAt: new Date('2026-11-01'),
  updatedAt: new Date('2026-11-01'),
  collectionItem: {
    id: 'item-1',
    userId: 'ash-id',
    cardId: 'base1-4',
    quantity: 3,
    reservedQuantity: 1,
    condition: 'NEAR_MINT',
    finish: 'HOLO',
    firstEdition: true,
    isPublic: false,
    card: { id: 'base1-4', name: 'Charizard', marketPrice: '312.5' },
    user: { username: 'ash', name: 'Ash Ketchum', accountStatus: 'ACTIVE', deletedAt: null, email: 'ash@pokebox.dev' },
  },
};

describe('isListingVisible', () => {
  const paused = { ...listing, status: 'PAUSED' };
  const suspendedOwner = {
    ...listing,
    collectionItem: { ...listing.collectionItem, user: { ...listing.collectionItem.user, accountStatus: 'SUSPENDED' } },
  };

  it('anúncio ACTIVE de conta usável é público', () => {
    expect(isListingVisible(listing, undefined)).toBe(true);
  });

  it('anúncio fora de ACTIVE some para visitantes e outros usuários', () => {
    expect(isListingVisible(paused, undefined)).toBe(false);
    expect(isListingVisible(paused, { id: 'misty-id', role: 'USER' })).toBe(false);
  });

  it('dono e ADMIN veem qualquer status', () => {
    expect(isListingVisible(paused, { id: 'ash-id', role: 'USER' })).toBe(true);
    expect(isListingVisible(paused, { id: 'admin-id', role: 'ADMIN' })).toBe(true);
  });

  it('dono suspenso esconde o anúncio', () => {
    expect(isListingVisible(suspendedOwner, undefined)).toBe(false);
  });
});

describe('toListingResponse', () => {
  it('monta dono, item e carta', () => {
    expect(toListingResponse(listing)).toEqual({
      id: 'listing-1',
      quantity: 1,
      description: 'troco por Blastoise',
      status: 'ACTIVE',
      createdAt: listing.createdAt,
      updatedAt: listing.updatedAt,
      owner: { username: 'ash', name: 'Ash Ketchum' },
      item: { id: 'item-1', condition: 'NEAR_MINT', finish: 'HOLO', firstEdition: true },
      card: { id: 'base1-4', name: 'Charizard', marketPrice: 312.5 },
    });
  });

  it.each(['userId', 'reservedQuantity', 'isPublic', 'email', 'collectionItemId', 'accountStatus'])(
    'não expõe %s',
    (field) => {
      expect(JSON.stringify(toListingResponse(listing))).not.toContain(`"${field}"`);
    },
  );
});
