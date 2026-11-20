import {
  assertCanConfirm,
  assertCanCreate,
  assertCanView,
  assertOfferTradable,
  assertStillTradable,
  assertTradeAction,
  buildTradeItems,
  closesAfterTrade,
  nextListingState,
  returnedListingState,
  toTradeResponse,
  trimListings,
} from './tradeRules.js';
import type { ListingStatus, OfferStatus, TradeStatus } from '../generated/prisma/index.js';
import type { TradeAction } from './tradeRules.js';

const statusOf = (fn: () => void): number | null => {
  try {
    fn();
  } catch (err) {
    return (err as { statusCode: number }).statusCode;
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
  const offer = { status: 'ACCEPTED' as OfferStatus };
  const listing = { status: 'ACTIVE' as ListingStatus };

  it.each<ListingStatus>(['ACTIVE', 'PAUSED'])('aceita oferta aceita sem troca em anúncio %s', (status) => {
    expect(() => assertOfferTradable({ offer, hasTrade: false, listing: { status } })).not.toThrow();
  });

  it.each<OfferStatus>(['PROPOSED', 'REJECTED', 'CANCELED'])('oferta %s dá 422', (status) => {
    expect(statusOf(() => assertOfferTradable({ offer: { status }, hasTrade: false, listing }))).toBe(422);
  });

  it('oferta que já virou troca dá 409', () => {
    expect(statusOf(() => assertOfferTradable({ offer, hasTrade: true, listing }))).toBe(409);
  });

  it.each<ListingStatus>(['CLOSED', 'BLOCKED'])('anúncio %s dá 422', (status) => {
    expect(statusOf(() => assertOfferTradable({ offer, hasTrade: false, listing: { status } }))).toBe(422);
  });
});

describe('assertTradeAction', () => {
  const trade = { proposerId: PROPOSER_ID, recipientId: OWNER_ID, status: 'PROPOSED' as TradeStatus };

  it.each<[TradeAction, string]>([
    ['reject', OWNER_ID],
    ['cancel', PROPOSER_ID],
  ])('%s pela parte certa passa', (action, userId) => {
    expect(() => assertTradeAction({ trade, userId, action })).not.toThrow();
  });

  it.each<TradeAction>(['reject', 'cancel'])('%s por quem não faz parte dá 403', (action) => {
    expect(statusOf(() => assertTradeAction({ trade, userId: OTHER_ID, action }))).toBe(403);
  });

  it.each<[TradeAction, string]>([
    ['reject', PROPOSER_ID],
    ['cancel', OWNER_ID],
  ])('%s pelo papel errado dá 403', (action, userId) => {
    expect(statusOf(() => assertTradeAction({ trade, userId, action }))).toBe(403);
  });

  it.each<TradeStatus>(['ACCEPTED', 'REJECTED', 'CANCELED'])('troca %s dá 409', (status) => {
    expect(statusOf(() => assertTradeAction({ trade: { ...trade, status }, userId: OWNER_ID, action: 'reject' }))).toBe(
      409,
    );
  });
});

describe('assertCanConfirm', () => {
  const trade = {
    proposerId: PROPOSER_ID,
    recipientId: OWNER_ID,
    status: 'PROPOSED' as TradeStatus,
    proposerConfirmedAt: null as Date | null,
    recipientConfirmedAt: null as Date | null,
  };
  const earlier = new Date('2026-11-20T10:00:00Z');

  it.each([
    [OWNER_ID, 'recipient'],
    [PROPOSER_ID, 'proposer'],
  ])('as duas partes confirmam (%s); a primeira não conclui', (userId, role) => {
    expect(assertCanConfirm({ trade, userId })).toEqual({ role, completes: false });
  });

  it('a segunda confirmação conclui', () => {
    expect(assertCanConfirm({ trade: { ...trade, proposerConfirmedAt: earlier }, userId: OWNER_ID })).toEqual({
      role: 'recipient',
      completes: true,
    });
    expect(assertCanConfirm({ trade: { ...trade, recipientConfirmedAt: earlier }, userId: PROPOSER_ID })).toEqual({
      role: 'proposer',
      completes: true,
    });
  });

  it('confirmar de novo dá 409', () => {
    expect(statusOf(() => assertCanConfirm({ trade: { ...trade, recipientConfirmedAt: earlier }, userId: OWNER_ID }))).toBe(409);
  });

  it('quem não faz parte dá 403', () => {
    expect(statusOf(() => assertCanConfirm({ trade, userId: OTHER_ID }))).toBe(403);
  });

  it.each<TradeStatus>(['ACCEPTED', 'REJECTED', 'CANCELED'])('troca %s dá 409', (status) => {
    expect(statusOf(() => assertCanConfirm({ trade: { ...trade, status }, userId: OWNER_ID }))).toBe(409);
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
  const card = (id: string) => ({ cardId: id, condition: 'NEAR_MINT' as const, finish: 'HOLO' as const, firstEdition: false });
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

  it('em 0 vira Em troca', () => {
    expect(nextListingState({ listing: { quantity: 2 }, taken: 2 })).toEqual({ quantity: 0, status: 'IN_TRADE' });
  });
});

describe('trimListings', () => {
  const listings = [
    { id: 'novo', quantity: 2, status: 'ACTIVE' as ListingStatus },
    { id: 'velho', quantity: 3, status: 'ACTIVE' as ListingStatus },
  ];

  it('não muda nada quando o anunciado cabe no disponível', () => {
    expect(trimListings({ listings, available: 5 })).toEqual([]);
  });

  it('reduz o anúncio mais novo primeiro e diz quanto tirou', () => {
    expect(trimListings({ listings, available: 4 })).toEqual([{ id: 'novo', quantity: 1, taken: 1 }]);
  });

  it('esvazia o mais novo (Em troca) e reduz o seguinte quando precisa', () => {
    expect(trimListings({ listings, available: 2 })).toEqual([
      { id: 'novo', quantity: 0, status: 'IN_TRADE', taken: 2 },
      { id: 'velho', quantity: 2, taken: 1 },
    ]);
  });

  it('esvazia todos quando não sobra nada disponível', () => {
    expect(trimListings({ listings, available: 0 })).toEqual([
      { id: 'novo', quantity: 0, status: 'IN_TRADE', taken: 2 },
      { id: 'velho', quantity: 0, status: 'IN_TRADE', taken: 3 },
    ]);
  });

  it('pausado que chega a 0 continua pausado', () => {
    const paused = [{ id: 'pausado', quantity: 1, status: 'PAUSED' as ListingStatus }];
    expect(trimListings({ listings: paused, available: 0 })).toEqual([{ id: 'pausado', quantity: 0, taken: 1 }]);
  });

  it('pula anúncio que já está em 0', () => {
    const withEmpty = [{ id: 'vazio', quantity: 0, status: 'IN_TRADE' as ListingStatus }, ...listings];
    expect(trimListings({ listings: withEmpty, available: 4 })).toEqual([{ id: 'novo', quantity: 1, taken: 1 }]);
  });
});

describe('returnedListingState', () => {
  it('Em troca recebe a quantidade e volta a ativo', () => {
    expect(returnedListingState({ listing: { status: 'IN_TRADE', quantity: 0 }, quantity: 2 })).toEqual({
      quantity: 2,
      status: 'ACTIVE',
    });
  });

  it.each<ListingStatus>(['ACTIVE', 'PAUSED'])('%s recebe a quantidade e mantém a situação', (status) => {
    expect(returnedListingState({ listing: { status, quantity: 1 }, quantity: 2 })).toEqual({ quantity: 3 });
  });

  it.each<ListingStatus>(['CLOSED', 'BLOCKED'])('%s não reabre', (status) => {
    expect(returnedListingState({ listing: { status, quantity: 0 }, quantity: 2 })).toBeNull();
  });
});

describe('closesAfterTrade', () => {
  it('Em troca sem outra troca aberta fecha', () => {
    expect(closesAfterTrade({ listing: { status: 'IN_TRADE' }, otherOpenHolds: 0 })).toBe(true);
  });

  it('Em troca com outra troca aberta continua', () => {
    expect(closesAfterTrade({ listing: { status: 'IN_TRADE' }, otherOpenHolds: 1 })).toBe(false);
  });

  it.each<ListingStatus>(['ACTIVE', 'PAUSED', 'CLOSED'])('%s não muda', (status) => {
    expect(closesAfterTrade({ listing: { status }, otherOpenHolds: 0 })).toBe(false);
  });
});

describe('toTradeResponse', () => {
  const trade = {
    id: 'trade-id',
    status: 'PROPOSED' as TradeStatus,
    createdAt: new Date('2026-11-08T12:00:00Z'),
    completedAt: null,
    proposerConfirmedAt: new Date('2026-11-09T12:00:00Z'),
    recipientConfirmedAt: null,
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
        condition: 'NEAR_MINT' as const,
        finish: 'HOLO' as const,
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
      proposerConfirmedAt: trade.proposerConfirmedAt,
      recipientConfirmedAt: null,
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
