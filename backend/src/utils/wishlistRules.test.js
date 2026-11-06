import { countOwnersByCard, toWishlistItemResponse } from './wishlistRules.js';

describe('countOwnersByCard', () => {
  it('conta um dono por linha, agrupado pela carta', () => {
    const owners = [
      { cardId: 'base1-4', userId: 'ash' },
      { cardId: 'base1-4', userId: 'brock' },
      { cardId: 'sv01-001', userId: 'ash' },
    ];
    const counts = countOwnersByCard(owners);

    expect(counts.get('base1-4')).toBe(2);
    expect(counts.get('sv01-001')).toBe(1);
  });

  it('devolve mapa vazio sem donos', () => {
    expect(countOwnersByCard([]).size).toBe(0);
  });
});

describe('toWishlistItemResponse', () => {
  const item = {
    id: 'item-1',
    userId: 'misty',
    cardId: 'base1-4',
    createdAt: new Date('2026-11-05T00:00:00Z'),
    card: { id: 'base1-4', name: 'Charizard' },
  };

  it('devolve os dados da carta e as oportunidades', () => {
    const owners = new Map([['base1-4', 2]]);

    expect(toWishlistItemResponse(item, owners)).toEqual({
      id: 'item-1',
      cardId: 'base1-4',
      card: { id: 'base1-4', name: 'Charizard' },
      createdAt: item.createdAt,
      opportunities: 2,
    });
  });

  it('não expõe userId', () => {
    expect(toWishlistItemResponse(item)).not.toHaveProperty('userId');
  });

  it('opportunities 0 quando ninguém tem a carta', () => {
    expect(toWishlistItemResponse(item, new Map()).opportunities).toBe(0);
    expect(toWishlistItemResponse(item).opportunities).toBe(0);
  });
});
