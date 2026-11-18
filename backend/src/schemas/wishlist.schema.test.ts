import { addWishlistItemSchema, listWishlistQuerySchema, wishlistItemIdSchema } from './wishlist.schema.js';

describe('addWishlistItemSchema', () => {
  it('aceita cardId', () => {
    expect(addWishlistItemSchema.safeParse({ cardId: 'base1-4' }).success).toBe(true);
  });

  it('sem lang usa inglês; aceita lang de um idioma do catálogo e ajusta pt-br como no GET', () => {
    expect(addWishlistItemSchema.parse({ cardId: 'base1-4' })).toEqual({ cardId: 'base1-4', lang: 'en' });
    expect(addWishlistItemSchema.parse({ cardId: 'base1-4', lang: 'ja' }).lang).toBe('ja');
    expect(addWishlistItemSchema.parse({ cardId: 'base1-4', lang: 'PT-BR' }).lang).toBe('pt');
  });

  it('recusa lang fora dos idiomas do catálogo', () => {
    const result = addWishlistItemSchema.safeParse({ cardId: 'base1-4', lang: 'xx' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]).toMatchObject({ path: ['lang'], message: 'Idioma inválido' });
  });

  it('recusa corpo vazio', () => {
    expect(addWishlistItemSchema.safeParse({}).success).toBe(false);
  });

  it.each(['', '   '])('recusa cardId "%s"', (cardId) => {
    expect(addWishlistItemSchema.safeParse({ cardId }).success).toBe(false);
  });

  it('recusa campo desconhecido', () => {
    const body = { cardId: 'base1-4', finish: 'HOLO' };
    expect(addWishlistItemSchema.safeParse(body).success).toBe(false);
  });
});

describe('wishlistItemIdSchema', () => {
  it('aceita uuid', () => {
    const id = 'f323730d-c965-42b2-b3f4-a059e009dfe7';
    expect(wishlistItemIdSchema.safeParse({ id }).success).toBe(true);
  });

  it('recusa id que não é uuid', () => {
    expect(wishlistItemIdSchema.safeParse({ id: 'abc' }).success).toBe(false);
  });
});

describe('listWishlistQuerySchema', () => {
  it('sem parâmetros não pagina', () => {
    expect(listWishlistQuerySchema.parse({})).toEqual({ filters: {}, page: null });
  });

  it('aceita q, type, rarity e sort', () => {
    expect(listWishlistQuerySchema.parse({ q: 'char', type: 'FIRE', rarity: ' Rare ', sort: 'name' })).toEqual({
      filters: { q: 'char', type: 'Fire', rarity: 'Rare', sort: 'name' },
      page: { page: 1, limit: 20 },
    });
  });

  it.each([{ rarity: '' }, { sort: 'price' }, { limit: '101' }])('recusa %o', (query) => {
    expect(listWishlistQuerySchema.safeParse(query).success).toBe(false);
  });
});
