import { addWishlistItemSchema, wishlistItemIdSchema } from './wishlist.schema.js';

describe('addWishlistItemSchema', () => {
  it('aceita cardId', () => {
    expect(addWishlistItemSchema.safeParse({ cardId: 'base1-4' }).success).toBe(true);
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
