import {
  collectionItemIdSchema,
  createCollectionItemSchema,
  updateCollectionItemSchema,
} from './collection.schema.js';

const validCreate = { cardId: 'sv01-001', quantity: 1, finish: 'NORMAL', firstEdition: false };

describe('createCollectionItemSchema', () => {
  it('aceita o corpo mínimo válido', () => {
    expect(createCollectionItemSchema.safeParse(validCreate).success).toBe(true);
  });

  it('aceita condition e isPublic opcionais', () => {
    const body = { ...validCreate, condition: 'MINT', isPublic: false };
    expect(createCollectionItemSchema.safeParse(body).success).toBe(true);
  });

  it.each(['finish', 'firstEdition', 'cardId', 'quantity'])('recusa sem %s', (field) => {
    const { [field]: _, ...body } = validCreate;
    expect(createCollectionItemSchema.safeParse(body).success).toBe(false);
  });

  it.each([0, -1, 1.5])('recusa quantity %s', (quantity) => {
    expect(createCollectionItemSchema.safeParse({ ...validCreate, quantity }).success).toBe(false);
  });

  it('recusa finish e condition fora do enum', () => {
    expect(createCollectionItemSchema.safeParse({ ...validCreate, finish: 'FOIL' }).success).toBe(false);
    expect(createCollectionItemSchema.safeParse({ ...validCreate, condition: 'NEW' }).success).toBe(false);
  });

  it('recusa campo desconhecido', () => {
    const body = { ...validCreate, reservedQuantity: 3 };
    expect(createCollectionItemSchema.safeParse(body).success).toBe(false);
  });
});

describe('updateCollectionItemSchema', () => {
  it('aceita quantity 0', () => {
    expect(updateCollectionItemSchema.safeParse({ quantity: 0 }).success).toBe(true);
  });

  it('recusa quantity -1', () => {
    expect(updateCollectionItemSchema.safeParse({ quantity: -1 }).success).toBe(false);
  });

  it('recusa corpo vazio', () => {
    expect(updateCollectionItemSchema.safeParse({}).success).toBe(false);
  });

  it('recusa mudar finish ou firstEdition', () => {
    expect(updateCollectionItemSchema.safeParse({ finish: 'HOLO' }).success).toBe(false);
    expect(updateCollectionItemSchema.safeParse({ firstEdition: true }).success).toBe(false);
  });
});

describe('collectionItemIdSchema', () => {
  it('aceita uuid', () => {
    const id = 'f323730d-c965-42b2-b3f4-a059e009dfe7';
    expect(collectionItemIdSchema.safeParse({ id }).success).toBe(true);
  });

  it('recusa id que não é uuid', () => {
    expect(collectionItemIdSchema.safeParse({ id: 'abc' }).success).toBe(false);
  });
});
