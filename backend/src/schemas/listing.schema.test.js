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

  it('descrição só com espaços vira null', () => {
    expect(createListingSchema.parse({ ...validCreate, description: '   ' }).description).toBeNull();
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

  it('descrição só com espaços vira null', () => {
    expect(updateListingSchema.parse({ description: '   ' })).toEqual({ description: null });
  });

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
  it('usa page 1, limit 20 e sort recent por padrão', () => {
    expect(listListingsQuerySchema.parse({})).toEqual({ page: 1, limit: 20, sort: 'recent' });
  });

  it('converte page e limit da query string', () => {
    expect(listListingsQuerySchema.parse({ page: '2', limit: '5', cardId: 'base1-4', username: 'ash' })).toEqual({
      page: 2,
      limit: 5,
      cardId: 'base1-4',
      username: 'ash',
      sort: 'recent',
    });
  });

  it('aceita todos os filtros novos e converte os valores', () => {
    expect(
      listListingsQuerySchema.parse({
        q: '  charizard base  ',
        condition: 'near_mint',
        finish: 'holo',
        firstEdition: 'false',
        setId: 'base1',
        type: 'Fire',
        rarity: 'Rare',
        sort: 'name',
      }),
    ).toEqual({
      q: 'charizard base',
      condition: 'NEAR_MINT',
      finish: 'HOLO',
      firstEdition: false,
      setId: 'base1',
      type: 'Fire',
      rarity: 'Rare',
      sort: 'name',
      page: 1,
      limit: 20,
    });
  });

  it.each([
    ['true', true],
    ['false', false],
  ])('firstEdition %s vira %s', (value, expected) => {
    expect(listListingsQuerySchema.parse({ firstEdition: value }).firstEdition).toBe(expected);
  });

  it.each(['recent', 'oldest', 'name'])('aceita sort %s', (sort) => {
    expect(listListingsQuerySchema.parse({ sort }).sort).toBe(sort);
  });

  it.each([
    { q: '' },
    { q: '   ' },
    { q: '!!!' },
    { q: 'a'.repeat(51) },
    { condition: 'NOVA' },
    { finish: 'GOLD' },
    { firstEdition: 'sim' },
    { firstEdition: '1' },
    { setId: 'base 1' },
    { type: '' },
    { type: 'a'.repeat(31) },
    { rarity: 'a'.repeat(51) },
    { sort: 'price' },
  ])('recusa filtro %o', (query) => {
    expect(listListingsQuerySchema.safeParse(query).success).toBe(false);
  });

  it('explica os valores aceitos em condition', () => {
    const { error } = listListingsQuerySchema.safeParse({ condition: 'NOVA' });
    expect(error.issues[0].path).toEqual(['condition']);
    expect(error.issues[0].message).toMatch(/NEAR_MINT/);
  });

  it.each([{ page: '0' }, { limit: '101' }, { limit: 'abc' }, { username: 'AB' }, { cardId: 'base1 4' }])(
    'recusa %o',
    (query) => {
      expect(listListingsQuerySchema.safeParse(query).success).toBe(false);
    },
  );
});

describe('mensagens da paginação', () => {
  const messageOf = (query) => listListingsQuerySchema.safeParse(query).error.issues[0].message;

  it.each([
    [{ limit: '0' }, 'limit mínimo é 1'],
    [{ page: '0' }, 'page mínima é 1'],
    [{ limit: '101' }, 'limit máximo é 100'],
    [{ limit: 'abc' }, 'limit deve ser um número'],
  ])('%o → %s', (query, message) => {
    expect(messageOf(query)).toBe(message);
  });
});

describe('listingIdSchema', () => {
  it('aceita uuid e recusa o resto', () => {
    expect(listingIdSchema.safeParse({ id: uuid }).success).toBe(true);
    expect(listingIdSchema.safeParse({ id: 'abc' }).success).toBe(false);
  });
});
