import {
  assertNotReserved,
  assertOwner,
  assertQuantity,
  assertVariant,
  toCollectionItemResponse,
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
    const item = { id: 'item-1', quantity: 5, reservedQuantity: 2, card: { id: 'base1-4' } };

    expect(toCollectionItemResponse(item)).toEqual({ ...item, available: 3 });
  });
});
