import {
  createListingSchema,
  listingIdSchema,
  listListingsQuerySchema,
  updateListingSchema,
} from './listing.schema.js';

const uuid = 'f323730d-c965-42b2-b3f4-a059e009dfe7';
const validCreate = { collectionItemId: uuid, quantity: 1 };

describe('createListingSchema', () => {
  it('aceita o corpo mínimo válido', () => {
    expect(createListingSchema.safeParse(validCreate).success).toBe(true);
  });

  it('aceita descrição e tira os espaços das pontas', () => {
    const result = createListingSchema.parse({ ...validCreate, description: '  troco  ' });
    expect(result.description).toBe('troco');
  });

  it.each(['collectionItemId', 'quantity'])('recusa sem %s', (field) => {
    const { [field]: _, ...body } = validCreate;
    expect(createListingSchema.safeParse(body).success).toBe(false);
  });

  it.each([0, -1, 1.5, '2'])('recusa quantity %s', (quantity) => {
    expect(createListingSchema.safeParse({ ...validCreate, quantity }).success).toBe(false);
  });

  it('recusa collectionItemId que não é uuid', () => {
    expect(createListingSchema.safeParse({ ...validCreate, collectionItemId: 'abc' }).success).toBe(false);
  });

  it('recusa descrição com mais de 500 caracteres', () => {
    expect(createListingSchema.safeParse({ ...validCreate, description: 'a'.repeat(501) }).success).toBe(false);
  });

  it.each([{ status: 'PAUSED' }, { price: 10 }, { type: 'trade' }])('recusa campo extra %o', (extra) => {
    expect(createListingSchema.safeParse({ ...validCreate, ...extra }).success).toBe(false);
  });
});

describe('updateListingSchema', () => {
  it.each([{ quantity: 2 }, { description: 'nova' }, { description: null }, { status: 'CLOSED' }])(
    'aceita %o',
    (body) => {
      expect(updateListingSchema.safeParse(body).success).toBe(true);
    },
  );

  it('recusa corpo vazio', () => {
    expect(updateListingSchema.safeParse({}).success).toBe(false);
  });

  it('recusa status fora do enum e quantity 0', () => {
    expect(updateListingSchema.safeParse({ status: 'SOLD' }).success).toBe(false);
    expect(updateListingSchema.safeParse({ quantity: 0 }).success).toBe(false);
  });

  it('recusa trocar o item da coleção', () => {
    expect(updateListingSchema.safeParse({ collectionItemId: uuid }).success).toBe(false);
  });
});

describe('listListingsQuerySchema', () => {
  it('usa page 1 e limit 20 por padrão', () => {
    expect(listListingsQuerySchema.parse({})).toEqual({ page: 1, limit: 20 });
  });

  it('converte page e limit da query string', () => {
    expect(listListingsQuerySchema.parse({ page: '2', limit: '5', cardId: 'base1-4', username: 'ash' })).toEqual({
      page: 2,
      limit: 5,
      cardId: 'base1-4',
      username: 'ash',
    });
  });

  it.each([{ page: '0' }, { limit: '101' }, { limit: 'abc' }, { username: 'AB' }, { cardId: 'base1 4' }])(
    'recusa %o',
    (query) => {
      expect(listListingsQuerySchema.safeParse(query).success).toBe(false);
    },
  );
});

describe('listingIdSchema', () => {
  it('aceita uuid e recusa o resto', () => {
    expect(listingIdSchema.safeParse({ id: uuid }).success).toBe(true);
    expect(listingIdSchema.safeParse({ id: 'abc' }).success).toBe(false);
  });
});
