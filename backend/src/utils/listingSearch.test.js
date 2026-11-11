import { cardWhere, listingOrderBy, tokenize } from './listingSearch.js';

describe('tokenize', () => {
  it.each([
    ['Charizard', ['charizard']],
    ['  charizard   base ', ['charizard', 'base']],
    ['Ho-Oh', ['ho', 'oh']],
    ['Pokémon Ação', ['pokemon', 'acao']],
    ['Mr. Mime #122', ['mr', 'mime', '122']],
    ['', []],
    ['!!! ---', []],
    [undefined, []],
  ])('%p → %p', (text, words) => {
    expect(tokenize(text)).toEqual(words);
  });
});

describe('cardWhere', () => {
  it('sem filtros deixa tudo undefined', () => {
    expect(cardWhere()).toEqual({ setId: undefined, rarity: undefined });
  });

  it('exige que cada palavra apareça no nome ou no set', () => {
    expect(cardWhere({ q: 'Charizard base' }).AND).toEqual([
      {
        OR: [
          { name: { contains: 'charizard', mode: 'insensitive' } },
          { setName: { contains: 'charizard', mode: 'insensitive' } },
        ],
      },
      {
        OR: [
          { name: { contains: 'base', mode: 'insensitive' } },
          { setName: { contains: 'base', mode: 'insensitive' } },
        ],
      },
    ]);
  });

  it('q sem palavras não filtra', () => {
    expect(cardWhere({ q: '!!!' })).not.toHaveProperty('AND');
  });

  it('monta setId, rarity e type', () => {
    expect(cardWhere({ setId: 'base1', rarity: 'Rare', type: 'Fire' })).toEqual({
      setId: 'base1',
      rarity: 'Rare',
      types: { has: 'Fire' },
    });
  });
});

describe('listingOrderBy', () => {
  it('recent é o padrão', () => {
    expect(listingOrderBy()).toEqual([{ createdAt: 'desc' }, { id: 'asc' }]);
  });

  it('oldest começa pelos mais antigos', () => {
    expect(listingOrderBy('oldest')[0]).toEqual({ createdAt: 'asc' });
  });

  it('name ordena pelo nome da carta', () => {
    expect(listingOrderBy('name')[0]).toEqual({ collectionItem: { card: { name: 'asc' } } });
  });
});
