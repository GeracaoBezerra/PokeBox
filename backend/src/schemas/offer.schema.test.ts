import {
  createOfferSchema,
  listOffersQuerySchema,
  offerIdSchema,
  updateOfferStatusSchema,
} from './offer.schema.js';

const uuid = (n: number) => `f323730d-c965-42b2-b3f4-${String(n).padStart(12, '0')}`;
const validCreate = { quantity: 1, items: [{ collectionItemId: uuid(1), quantity: 1 }] };

describe('createOfferSchema', () => {
  it('aceita o corpo mínimo válido', () => {
    expect(createOfferSchema.safeParse(validCreate).success).toBe(true);
  });

  it('aceita mensagem e tira os espaços das pontas', () => {
    expect(createOfferSchema.parse({ ...validCreate, message: '  troco  ' }).message).toBe('troco');
  });

  it('mensagem só com espaços vira null', () => {
    expect(createOfferSchema.parse({ ...validCreate, message: '   ' }).message).toBeNull();
  });

  it('recusa mensagem com mais de 500 caracteres', () => {
    expect(createOfferSchema.safeParse({ ...validCreate, message: 'a'.repeat(501) }).success).toBe(false);
  });

  it.each(['quantity', 'items'])('recusa sem %s', (field) => {
    const body: Record<string, unknown> = { ...validCreate };
    delete body[field];
    expect(createOfferSchema.safeParse(body).success).toBe(false);
  });

  it.each([0, -1, 1.5, '2'])('recusa quantity %s', (quantity) => {
    expect(createOfferSchema.safeParse({ ...validCreate, quantity }).success).toBe(false);
  });

  it('recusa items vazio', () => {
    expect(createOfferSchema.safeParse({ ...validCreate, items: [] }).success).toBe(false);
  });

  it('aceita 20 itens e recusa 21', () => {
    const items = (n: number) => Array.from({ length: n }, (_, i) => ({ collectionItemId: uuid(i + 1), quantity: 1 }));
    expect(createOfferSchema.safeParse({ ...validCreate, items: items(20) }).success).toBe(true);
    expect(createOfferSchema.safeParse({ ...validCreate, items: items(21) }).success).toBe(false);
  });

  it('recusa o mesmo item da coleção duas vezes', () => {
    const items = [
      { collectionItemId: uuid(1), quantity: 1 },
      { collectionItemId: uuid(1), quantity: 2 },
    ];
    expect(createOfferSchema.safeParse({ ...validCreate, items }).success).toBe(false);
  });

  it.each([0, 1.5, '1'])('recusa quantity %s num item', (quantity) => {
    const items = [{ collectionItemId: uuid(1), quantity }];
    expect(createOfferSchema.safeParse({ ...validCreate, items }).success).toBe(false);
  });

  it('recusa collectionItemId que não é uuid', () => {
    const items = [{ collectionItemId: 'abc', quantity: 1 }];
    expect(createOfferSchema.safeParse({ ...validCreate, items }).success).toBe(false);
  });

  it('recusa campo extra no corpo e no item', () => {
    expect(createOfferSchema.safeParse({ ...validCreate, status: 'ACCEPTED' }).success).toBe(false);
    const items = [{ collectionItemId: uuid(1), quantity: 1, price: 10 }];
    expect(createOfferSchema.safeParse({ ...validCreate, items }).success).toBe(false);
  });
});

describe('updateOfferStatusSchema', () => {
  it.each(['ACCEPTED', 'REJECTED', 'CANCELED'])('aceita %s', (status) => {
    expect(updateOfferStatusSchema.safeParse({ status }).success).toBe(true);
  });

  it.each(['PROPOSED', 'accepted', undefined])('recusa %s', (status) => {
    expect(updateOfferStatusSchema.safeParse({ status }).success).toBe(false);
  });

  it('recusa campo extra', () => {
    expect(updateOfferStatusSchema.safeParse({ status: 'CANCELED', quantity: 2 }).success).toBe(false);
  });
});

describe('listOffersQuerySchema', () => {
  it('status é opcional', () => {
    expect(listOffersQuerySchema.parse({})).toEqual({});
  });

  it.each(['PROPOSED', 'ACCEPTED', 'REJECTED', 'CANCELED'])('aceita filtro %s', (status) => {
    expect(listOffersQuerySchema.safeParse({ status }).success).toBe(true);
  });

  it('recusa status desconhecido', () => {
    expect(listOffersQuerySchema.safeParse({ status: 'OPEN' }).success).toBe(false);
  });
});

describe('offerIdSchema', () => {
  it('exige uuid', () => {
    expect(offerIdSchema.safeParse({ id: uuid(1) }).success).toBe(true);
    expect(offerIdSchema.safeParse({ id: '123' }).success).toBe(false);
  });
});
