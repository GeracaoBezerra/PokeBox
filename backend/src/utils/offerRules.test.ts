import {
  assertCanPropose,
  assertListingActive,
  assertOfferItem,
  assertStatusChange,
  assertStillFulfillable,
  toOfferResponse,
} from './offerRules.js';
import type { ListingStatus, OfferStatus } from '../generated/prisma/index.js';

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

describe('assertCanPropose', () => {
  const listing = { quantity: 2, collectionItem: { userId: OWNER_ID } };

  it('aceita oferta de outro usuário dentro da quantidade do anúncio', () => {
    expect(() => assertCanPropose({ listing, proposerId: PROPOSER_ID, quantity: 2 })).not.toThrow();
  });

  it('recusa oferta no próprio anúncio com 422', () => {
    expect(statusOf(() => assertCanPropose({ listing, proposerId: OWNER_ID, quantity: 1 }))).toBe(422);
  });

  it('recusa quantidade acima da do anúncio com 422', () => {
    expect(statusOf(() => assertCanPropose({ listing, proposerId: PROPOSER_ID, quantity: 3 }))).toBe(422);
  });
});

describe('assertOfferItem', () => {
  const item = { userId: PROPOSER_ID, quantity: 3, reservedQuantity: 0 };

  it('aceita item do proponente que cabe no disponível', () => {
    expect(() => assertOfferItem({ item, proposerId: PROPOSER_ID, requested: 3 })).not.toThrow();
  });

  it('recusa item de outro usuário com 403', () => {
    expect(statusOf(() => assertOfferItem({ item, proposerId: OWNER_ID, requested: 1 }))).toBe(403);
  });

  it('recusa quantidade acima do disponível com 422', () => {
    expect(statusOf(() => assertOfferItem({ item, proposerId: PROPOSER_ID, requested: 4 }))).toBe(422);
  });

  it('desconta a reserva do disponível', () => {
    const reserved = { ...item, reservedQuantity: 2 };
    expect(() => assertOfferItem({ item: reserved, proposerId: PROPOSER_ID, requested: 1 })).not.toThrow();
    expect(statusOf(() => assertOfferItem({ item: reserved, proposerId: PROPOSER_ID, requested: 2 }))).toBe(422);
  });
});

describe('assertStatusChange', () => {
  const owner = { isProposer: false, isListingOwner: true };
  const proposer = { isProposer: true, isListingOwner: false };
  const stranger = { isProposer: false, isListingOwner: false };
  const proposed = { status: 'PROPOSED' as OfferStatus };

  it.each<[string, typeof owner, OfferStatus]>([
    ['dono', owner, 'ACCEPTED'],
    ['dono', owner, 'REJECTED'],
    ['proponente', proposer, 'CANCELED'],
  ])('%s pode mudar oferta PROPOSED para %s', (_, who, nextStatus) => {
    expect(() => assertStatusChange({ offer: proposed, nextStatus, ...who })).not.toThrow();
  });

  it.each<OfferStatus>(['ACCEPTED', 'REJECTED', 'CANCELED'])('quem não participa recebe 403 em %s', (nextStatus) => {
    expect(statusOf(() => assertStatusChange({ offer: proposed, nextStatus, ...stranger }))).toBe(403);
  });

  it.each<OfferStatus>(['ACCEPTED', 'REJECTED'])('proponente não pode %s: 403', (nextStatus) => {
    expect(statusOf(() => assertStatusChange({ offer: proposed, nextStatus, ...proposer }))).toBe(403);
  });

  it('dono do anúncio não pode cancelar: 403', () => {
    expect(statusOf(() => assertStatusChange({ offer: proposed, nextStatus: 'CANCELED', ...owner }))).toBe(403);
  });

  describe('RN-06: oferta finalizada não muda mais', () => {
    const cases: [OfferStatus, OfferStatus, typeof owner][] = [
      ['ACCEPTED', 'ACCEPTED', owner],
      ...(['REJECTED', 'CANCELED'] as const).flatMap((from): [OfferStatus, OfferStatus, typeof owner][] => [
        [from, 'ACCEPTED', owner],
        [from, 'REJECTED', owner],
        [from, 'CANCELED', proposer],
      ]),
    ];

    it.each(cases)('de %s para %s: 422', (from, nextStatus, who) => {
      expect(statusOf(() => assertStatusChange({ offer: { status: from }, nextStatus, ...who }))).toBe(422);
    });
  });

  describe('oferta aceita que ainda não virou troca pode ser encerrada', () => {
    const accepted = { status: 'ACCEPTED' as OfferStatus };

    it.each<[string, typeof owner, OfferStatus]>([
      ['dono recusa', owner, 'REJECTED'],
      ['proponente cancela', proposer, 'CANCELED'],
    ])('%s', (_, who, nextStatus) => {
      expect(() => assertStatusChange({ offer: accepted, nextStatus, ...who, hasTrade: false })).not.toThrow();
    });

    it.each<[typeof owner, OfferStatus]>([
      [owner, 'REJECTED'],
      [proposer, 'CANCELED'],
    ])('oferta que já virou troca dá 409 em %#', (who, nextStatus) => {
      expect(statusOf(() => assertStatusChange({ offer: accepted, nextStatus, ...who, hasTrade: true }))).toBe(409);
    });

    it('papéis continuam valendo: dono não cancela, proponente não recusa', () => {
      expect(statusOf(() => assertStatusChange({ offer: accepted, nextStatus: 'CANCELED', ...owner }))).toBe(403);
      expect(statusOf(() => assertStatusChange({ offer: accepted, nextStatus: 'REJECTED', ...proposer }))).toBe(403);
    });
  });

  it('papel errado vem antes do status finalizado: 403', () => {
    expect(statusOf(() => assertStatusChange({ offer: { status: 'CANCELED' as const }, nextStatus: 'ACCEPTED', ...proposer }))).toBe(403);
    expect(statusOf(() => assertStatusChange({ offer: { status: 'ACCEPTED' as const }, nextStatus: 'REJECTED', ...stranger }))).toBe(403);
  });
});

describe('assertListingActive', () => {
  it('aceita anúncio ACTIVE', () => {
    expect(() => assertListingActive({ status: 'ACTIVE' })).not.toThrow();
  });

  it.each<ListingStatus>(['PAUSED', 'CLOSED', 'BLOCKED'])('recusa anúncio %s com 422', (status) => {
    expect(statusOf(() => assertListingActive({ status }))).toBe(422);
  });
});

describe('assertStillFulfillable', () => {
  const listing = { quantity: 2 };
  const item = (quantity: number, reservedQuantity = 0) => ({ quantity, reservedQuantity });

  it('aceita quando o anúncio e as cartas oferecidas ainda cobrem a oferta', () => {
    const offeredItems = [{ item: item(1), requested: 1 }, { item: item(3, 1), requested: 2 }];
    expect(() => assertStillFulfillable({ offerQuantity: 2, listing, offeredItems })).not.toThrow();
  });

  it('recusa com 422 quando o dono baixou o anúncio abaixo do que a oferta pede', () => {
    const offeredItems = [{ item: item(1), requested: 1 }];
    expect(statusOf(() => assertStillFulfillable({ offerQuantity: 3, listing, offeredItems }))).toBe(422);
  });

  it('a mensagem mostra como sair: aumentar o anúncio ou encerrar a oferta', () => {
    const offeredItems = [{ item: item(1), requested: 1 }];
    expect(() => assertStillFulfillable({ offerQuantity: 3, listing, offeredItems })).toThrow(
      'Aumente o anúncio ou encerre a oferta (quem ofertou cancela, o dono recusa)',
    );
  });

  it('recusa com 422 quando quem ofertou zerou a carta oferecida', () => {
    const offeredItems = [{ item: item(0), requested: 1 }];
    expect(statusOf(() => assertStillFulfillable({ offerQuantity: 1, listing, offeredItems }))).toBe(422);
  });

  it('desconta a reserva da carta oferecida', () => {
    const offeredItems = [{ item: item(2, 2), requested: 1 }];
    expect(statusOf(() => assertStillFulfillable({ offerQuantity: 1, listing, offeredItems }))).toBe(422);
  });
});

describe('toOfferResponse', () => {
  const card = { id: 'base1-4', name: 'Charizard', marketPrice: '312.50' };
  const offer = {
    id: 'offer-1',
    listingId: 'listing-1',
    proposerId: PROPOSER_ID,
    quantity: 1,
    message: 'Troco?',
    status: 'PROPOSED' as OfferStatus,
    respondedAt: null,
    createdAt: new Date('2026-11-08T00:00:00Z'),
    updatedAt: new Date('2026-11-08T00:00:00Z'),
    proposer: { username: 'misty', name: 'Misty', email: 'misty@pokebox.dev' },
    listing: {
      id: 'listing-1',
      quantity: 1,
      description: null,
      status: 'ACTIVE' as ListingStatus,
      createdAt: new Date(),
      updatedAt: new Date(),
      collectionItemId: 'item-ash',
      collectionItem: {
        id: 'item-ash',
        userId: OWNER_ID,
        quantity: 1,
        reservedQuantity: 0,
        isPublic: true,
        condition: 'NEAR_MINT' as const,
        finish: 'HOLO' as const,
        firstEdition: true,
        card,
        user: { username: 'ash', name: 'Ash', accountStatus: 'ACTIVE' as const, deletedAt: null },
      },
    },
    items: [
      {
        id: 'offer-item-1',
        offerId: 'offer-1',
        collectionItemId: 'item-misty',
        quantity: 1,
        collectionItem: {
          id: 'item-misty',
          userId: PROPOSER_ID,
          quantity: 2,
          reservedQuantity: 1,
          isPublic: false,
          condition: 'LIGHT_PLAYED' as const,
          finish: 'HOLO' as const,
          firstEdition: false,
          card: { id: 'base1-10', name: 'Mew', marketPrice: '20.00' },
        },
      },
    ],
  };

  const response = toOfferResponse(offer);

  it('monta a oferta com proponente, anúncio e itens', () => {
    expect(response).toMatchObject({
      id: 'offer-1',
      status: 'PROPOSED',
      quantity: 1,
      message: 'Troco?',
      respondedAt: null,
      proposer: { username: 'misty', name: 'Misty' },
      listing: { id: 'listing-1', owner: { username: 'ash', name: 'Ash' } },
      items: [
        {
          collectionItemId: 'item-misty',
          quantity: 1,
          condition: 'LIGHT_PLAYED' as const,
          finish: 'HOLO' as const,
          firstEdition: false,
          card: { id: 'base1-10', name: 'Mew' },
        },
      ],
    });
  });

  it('converte o preço de referência para número', () => {
    expect(response.items[0].card.marketPrice).toBe(20);
    expect(response.listing.card.marketPrice).toBe(312.5);
  });

  it('não vaza ids de usuário, e-mail, reserva nem visibilidade', () => {
    const json = JSON.stringify(response);
    for (const field of ['userId', 'proposerId', 'email', 'reservedQuantity', 'isPublic', 'accountStatus', 'deletedAt']) {
      expect(json).not.toContain(`"${field}"`);
    }
  });

  it('oferta sem itens (recusada ou cancelada) vem com items vazio', () => {
    expect(toOfferResponse({ ...offer, status: 'REJECTED' as const, items: [] }).items).toEqual([]);
  });
});
