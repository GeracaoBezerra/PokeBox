import {
  assertCoversListings,
  assertNoListings,
  assertNoOffers,
  assertNotReserved,
  assertOwner,
  assertQuantity,
  assertVariant,
  toCollectionItemResponse,
  toPublicCollectionItem,
} from './collectionRules.js';

const statusOf = (fn) => {
  try {
    fn();
  } catch (err) {
    return err.statusCode;
  }
  return null;
};

describe('assertOwner', () => {
  const item = { id: 'item-1', userId: 'ash' };

  it('libera o dono do item', () => {
    expect(() => assertOwner(item, 'ash')).not.toThrow();
  });

  it('bloqueia outro usuário com 403', () => {
    expect(statusOf(() => assertOwner(item, 'misty'))).toBe(403);
  });

  it('bloqueia ADMIN que não é o dono com 403', () => {
    const admin = { id: 'admin', role: 'ADMIN' };
    expect(statusOf(() => assertOwner(item, admin.id))).toBe(403);
  });
});

describe('assertQuantity', () => {
  it('aceita quantidade igual à reservada', () => {
    expect(() => assertQuantity(2, 2)).not.toThrow();
  });

  it('aceita zero quando nada está reservado', () => {
    expect(() => assertQuantity(0, 0)).not.toThrow();
  });

  it('recusa quantidade abaixo da reservada com 422', () => {
    expect(statusOf(() => assertQuantity(1, 2))).toBe(422);
  });
});

describe('assertCoversListings', () => {
  it('aceita quantidade que cobre reserva e anúncios', () => {
    expect(() => assertCoversListings(4, 1, 3)).not.toThrow();
  });

  it('aceita qualquer quantidade quando não há anúncio nem reserva', () => {
    expect(() => assertCoversListings(0, 0, 0)).not.toThrow();
  });

  it('recusa com 422 quantidade abaixo do que está anunciado', () => {
    expect(statusOf(() => assertCoversListings(1, 0, 2))).toBe(422);
  });

  it('soma reserva e anúncios', () => {
    expect(statusOf(() => assertCoversListings(3, 1, 3))).toBe(422);
  });
});

describe('assertNoListings', () => {
  it('libera item que nunca foi anunciado', () => {
    expect(() => assertNoListings({ open: 0, total: 0 })).not.toThrow();
  });

  it('bloqueia item com anúncio aberto com 409', () => {
    expect(statusOf(() => assertNoListings({ open: 1, total: 1 }))).toBe(409);
  });

  it('bloqueia item com anúncio só no histórico com 409 e mensagem própria', () => {
    expect(statusOf(() => assertNoListings({ open: 0, total: 2 }))).toBe(409);
    expect(() => assertNoListings({ open: 0, total: 2 })).toThrow(/histórico/);
    expect(() => assertNoListings({ open: 1, total: 2 })).toThrow(/Feche o anúncio/);
  });
});

describe('assertNoOffers', () => {
  it('libera item que não está em oferta aberta nem aceita', () => {
    expect(() => assertNoOffers({ open: 0, accepted: 0 })).not.toThrow();
  });

  it('bloqueia item em oferta aberta com 409 e mensagem própria', () => {
    expect(statusOf(() => assertNoOffers({ open: 1, accepted: 0 }))).toBe(409);
    expect(() => assertNoOffers({ open: 1, accepted: 1 })).toThrow(/Cancele a oferta/);
  });

  it('bloqueia item em oferta aceita com 409', () => {
    expect(statusOf(() => assertNoOffers({ open: 0, accepted: 1 }))).toBe(409);
    expect(() => assertNoOffers({ open: 0, accepted: 1 })).toThrow(/aguardando a troca/);
  });
});

describe('assertNotReserved', () => {
  it('libera item sem reserva', () => {
    expect(() => assertNotReserved({ reservedQuantity: 0 })).not.toThrow();
  });

  it('bloqueia item com reserva com 409', () => {
    expect(statusOf(() => assertNotReserved({ reservedQuantity: 1 }))).toBe(409);
  });
});

describe('assertVariant', () => {
  const allVariants = { normal: true, holo: true, reverse: true, firstEdition: true };

  it.each([
    ['NORMAL', 'normal'],
    ['HOLO', 'holo'],
    ['REVERSE', 'reverse'],
  ])('aceita %s quando a carta tem a variante %s', (finish, variant) => {
    expect(() => assertVariant({ [variant]: true }, finish, false)).not.toThrow();
  });

  it.each(['NORMAL', 'HOLO', 'REVERSE'])('recusa %s quando a carta não tem a variante', (finish) => {
    const variants = { ...allVariants, [finish.toLowerCase()]: false };
    expect(statusOf(() => assertVariant(variants, finish, false))).toBe(422);
  });

  it('recusa 1ª edição quando a carta não tem 1ª edição', () => {
    const variants = { holo: true, firstEdition: false };
    expect(statusOf(() => assertVariant(variants, 'HOLO', true))).toBe(422);
  });

  it('aceita 1ª edição quando a carta tem 1ª edição', () => {
    expect(() => assertVariant({ holo: true, firstEdition: true }, 'HOLO', true)).not.toThrow();
  });

  it('não bloqueia quando a TCGdex não informou nenhuma variante', () => {
    const empty = { normal: false, holo: false, reverse: false, firstEdition: false };
    expect(() => assertVariant(empty, 'REVERSE', true)).not.toThrow();
    expect(() => assertVariant({}, 'HOLO', false)).not.toThrow();
    expect(() => assertVariant(undefined, 'NORMAL', false)).not.toThrow();
  });
});

describe('toCollectionItemResponse', () => {
  it('calcula available e mantém os dados da carta', () => {
    const item = { id: 'item-1', quantity: 5, reservedQuantity: 2, card: { id: 'base1-4', marketPrice: null } };

    expect(toCollectionItemResponse(item)).toEqual({ ...item, available: 3 });
  });

  it('devolve o preço de referência como número', () => {
    const item = { id: 'item-1', quantity: 1, reservedQuantity: 0, card: { id: 'base1-4', marketPrice: '312.5' } };

    expect(toCollectionItemResponse(item).card.marketPrice).toBe(312.5);
  });
});

describe('toPublicCollectionItem', () => {
  const item = {
    id: 'item-1',
    userId: 'ash',
    cardId: 'base1-4',
    quantity: 3,
    reservedQuantity: 1,
    condition: 'NEAR_MINT',
    finish: 'HOLO',
    firstEdition: false,
    isPublic: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    card: { id: 'base1-4', name: 'Charizard', marketPrice: '312.5' },
  };

  it('devolve só os campos públicos', () => {
    expect(toPublicCollectionItem(item)).toEqual({
      id: 'item-1',
      card: { id: 'base1-4', name: 'Charizard', marketPrice: 312.5 },
      quantity: 3,
      condition: 'NEAR_MINT',
      finish: 'HOLO',
      firstEdition: false,
    });
  });

  it.each(['userId', 'reservedQuantity', 'isPublic', 'available', 'createdAt', 'updatedAt'])(
    'não expõe %s',
    (field) => {
      expect(toPublicCollectionItem(item)).not.toHaveProperty(field);
    },
  );
});
