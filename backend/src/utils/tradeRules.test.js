import {
  assertCanCreate,
  assertCanView,
  assertOfferTradable,
  assertStillTradable,
  assertTradeAction,
  buildTradeItems,
  nextListingState,
  toTradeResponse,
  trimListings,
} from './tradeRules.js';

const statusOf = (fn) => {
  try {
    fn();
  } catch (err) {
    return err.statusCode;
  }
  return null;
};

const OWNER_ID = 'owner-id';
const PROPOSER_ID = 'proposer-id';
const OTHER_ID = 'other-id';

describe('assertCanView', () => {
  const trade = { proposerId: PROPOSER_ID, recipientId: OWNER_ID };

  it.each([PROPOSER_ID, OWNER_ID])('deixa a parte %s ver', (userId) => {
    expect(() => assertCanView(trade, userId)).not.toThrow();
  });

  it('recusa quem não faz parte com 403', () => {
    expect(statusOf(() => assertCanView(trade, OTHER_ID))).toBe(403);
  });
});

describe('assertCanCreate', () => {
  const offer = { proposerId: PROPOSER_ID, listing: { collectionItem: { userId: OWNER_ID } } };

  it('deixa quem fez a oferta criar a troca', () => {
    expect(() => assertCanCreate({ offer, userId: PROPOSER_ID })).not.toThrow();
  });

  it('oferta que não existe dá 404', () => {
    expect(statusOf(() => assertCanCreate({ offer: null, userId: PROPOSER_ID }))).toBe(404);
  });

  it('quem não faz parte da oferta recebe 404', () => {
    expect(statusOf(() => assertCanCreate({ offer, userId: OTHER_ID }))).toBe(404);
  });

  it('dono do anúncio recebe 403', () => {
    expect(statusOf(() => assertCanCreate({ offer, userId: OWNER_ID }))).toBe(403);
  });
});

describe('assertOfferTradable', () => {
  const offer = { status: 'ACCEPTED' };
  const listing = { status: 'ACTIVE' };

  it.each(['ACTIVE', 'PAUSED'])('aceita oferta aceita sem troca em anúncio %s', (status) => {
    expect(() => assertOfferTradable({ offer, hasTrade: false, listing: { status } })).not.toThrow();
  });

  it.each(['PROPOSED', 'REJECTED', 'CANCELED'])('oferta %s dá 422', (status) => {
    expect(statusOf(() => assertOfferTradable({ offer: { status }, hasTrade: false, listing }))).toBe(422);
  });

  it('oferta que já virou troca dá 409', () => {
    expect(statusOf(() => assertOfferTradable({ offer, hasTrade: true, listing }))).toBe(409);
  });

  it.each(['CLOSED', 'BLOCKED'])('anúncio %s dá 422', (status) => {
    expect(statusOf(() => assertOfferTradable({ offer, hasTrade: false, listing: { status } }))).toBe(422);
  });
});

describe('assertTradeAction', () => {
  const trade = { proposerId: PROPOSER_ID, recipientId: OWNER_ID, status: 'PROPOSED' };

  it.each([
    ['accept', OWNER_ID],
    ['reject', OWNER_ID],
    ['cancel', PROPOSER_ID],
  ])('%s pela parte certa passa', (action, userId) => {
    expect(() => assertTradeAction({ trade, userId, action })).not.toThrow();
  });

  it.each(['accept', 'reject', 'cancel'])('%s por quem não faz parte dá 403', (action) => {
    expect(statusOf(() => assertTradeAction({ trade, userId: OTHER_ID, action }))).toBe(403);
  });

  it.each([
    ['accept', PROPOSER_ID],
    ['reject', PROPOSER_ID],
    ['cancel', OWNER_ID],
  ])('%s pelo papel errado dá 403', (action, userId) => {
    expect(statusOf(() => assertTradeAction({ trade, userId, action }))).toBe(403);
  });

  it.each(['ACCEPTED', 'REJECTED', 'CANCELED'])('troca %s dá 409', (status) => {
    expect(statusOf(() => assertTradeAction({ trade: { ...trade, status }, userId: OWNER_ID, action: 'accept' }))).toBe(
      409,
    );
  });
});

describe('assertStillTradable', () => {
  const tradeItem = { fromUserId: OWNER_ID, quantity: 2 };
  const item = { userId: OWNER_ID, quantity: 3, reservedQuantity: 2 };

  it('aceita item do mesmo dono com quantidade e reserva', () => {
    expect(() => assertStillTradable({ item, tradeItem })).not.toThrow();
  });

  it.each([
    ['item apagado', null],
    ['outro dono', { ...item, userId: OTHER_ID }],
    ['quantidade menor', { ...item, quantity: 1 }],
    ['reserva menor', { ...item, reservedQuantity: 1 }],
  ])('%s dá 422', (_, current) => {
    expect(statusOf(() => assertStillTradable({ item: current, tradeItem }))).toBe(422);
  });
});

describe('buildTradeItems', () => {
  const card = (id) => ({ cardId: id, condition: 'NEAR_MINT', finish: 'HOLO', firstEdition: false });
  const listing = { collectionItem: { id: 'item-owner', ...card('base1-4'), userId: OWNER_ID } };
  const offer = {
    proposerId: PROPOSER_ID,
    quantity: 1,
    items: [{ quantity: 2, collectionItem: { id: 'item-proposer', ...card('base1-8') } }],
  };

  it('copia a carta do anúncio e das cartas oferecidas, cada uma no sentido certo', () => {
    expect(buildTradeItems({ offer, listing })).toEqual([
      { collectionItemId: 'item-owner', ...card('base1-4'), quantity: 1, fromUserId: OWNER_ID, toUserId: PROPOSER_ID },
      { collectionItemId: 'item-proposer', ...card('base1-8'), quantity: 2, fromUserId: PROPOSER_ID, toUserId: OWNER_ID },
    ]);
  });
});

describe('nextListingState', () => {
  it('baixa a quantidade quando sobra alguma', () => {
    expect(nextListingState({ listing: { quantity: 3 }, taken: 1 })).toEqual({ quantity: 2 });
  });

  it('fecha o anúncio quando não sobra nada, sem mexer na quantidade', () => {
    expect(nextListingState({ listing: { quantity: 2 }, taken: 2 })).toEqual({ status: 'CLOSED' });
  });
});

describe('trimListings', () => {
  const listings = [
    { id: 'novo', quantity: 2 },
    { id: 'velho', quantity: 3 },
  ];

  it('não muda nada quando o anunciado cabe no disponível', () => {
    expect(trimListings({ listings, available: 5 })).toEqual([]);
  });

  it('reduz o anúncio mais novo primeiro', () => {
    expect(trimListings({ listings, available: 4 })).toEqual([{ id: 'novo', quantity: 1 }]);
  });

  it('fecha o mais novo e reduz o seguinte quando precisa', () => {
    expect(trimListings({ listings, available: 2 })).toEqual([
      { id: 'novo', status: 'CLOSED' },
      { id: 'velho', quantity: 2 },
    ]);
  });

  it('fecha todos quando não sobra nada disponível', () => {
    expect(trimListings({ listings, available: 0 })).toEqual([
      { id: 'novo', status: 'CLOSED' },
      { id: 'velho', status: 'CLOSED' },
    ]);
  });
});

describe('toTradeResponse', () => {
  const trade = {
    id: 'trade-id',
    status: 'PROPOSED',
    createdAt: new Date('2026-11-08T12:00:00Z'),
    completedAt: null,
    offerId: 'offer-id',
    proposerId: PROPOSER_ID,
    recipientId: OWNER_ID,
    proposer: { username: 'misty', name: 'Misty' },
    recipient: { username: 'ash', name: 'Ash Ketchum' },
    items: [
      {
        id: 'ti-1',
        collectionItemId: 'item-owner',
        fromUserId: OWNER_ID,
        toUserId: PROPOSER_ID,
        fromUser: { username: 'ash' },
        toUser: { username: 'misty' },
        quantity: 1,
        condition: 'NEAR_MINT',
        finish: 'HOLO',
        firstEdition: true,
        card: { id: 'base1-4', name: 'Charizard', marketPrice: '199.90' },
      },
    ],
  };

  it('monta a troca com usernames e a carta da cópia', () => {
    expect(toTradeResponse(trade)).toEqual({
      id: 'trade-id',
      status: 'PROPOSED',
      createdAt: trade.createdAt,
      completedAt: null,
      offerId: 'offer-id',
      proposer: { username: 'misty', name: 'Misty' },
      recipient: { username: 'ash', name: 'Ash Ketchum' },
      items: [
        {
          from: 'ash',
          to: 'misty',
          quantity: 1,
          condition: 'NEAR_MINT',
          finish: 'HOLO',
          firstEdition: true,
          card: { id: 'base1-4', name: 'Charizard', marketPrice: 199.9 },
        },
      ],
    });
  });

  it('não expõe ids de usuário nem do item da coleção', () => {
    const json = JSON.stringify(toTradeResponse(trade));
    expect(json).not.toContain(OWNER_ID);
    expect(json).not.toContain(PROPOSER_ID);
    expect(json).not.toContain('item-owner');
  });
});
