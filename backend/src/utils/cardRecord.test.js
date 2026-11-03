import { toCardRecord } from './cardRecord.js';

const charizard = {
  id: 'base1-4',
  name: 'Charizard',
  number: '4/102',
  rarity: 'Rare',
  illustrator: 'Mitsuhiro Arita',
  category: 'Pokemon',
  image: { small: 'https://assets.tcgdex.net/en/base/base1/4/low.webp', large: null },
  set: { id: 'base1', name: 'Base Set', series: 'Base', releaseDate: '1999-01-09' },
  hp: 120,
  types: ['Fire'],
  stage: 'Stage2',
  dexId: [6],
  regulationMark: null,
  trainerType: null,
  energyType: null,
};

describe('toCardRecord', () => {
  it('converte a ficha da carta na linha da tabela Card', () => {
    expect(toCardRecord(charizard)).toEqual({
      id: 'base1-4',
      name: 'Charizard',
      setId: 'base1',
      setName: 'Base Set',
      setSeries: 'Base',
      releaseDate: new Date('1999-01-09'),
      number: '4/102',
      rarity: 'Rare',
      imageUrl: 'https://assets.tcgdex.net/en/base/base1/4/low.webp',
      category: 'Pokemon',
      types: ['Fire'],
      hp: 120,
      stage: 'Stage2',
      illustrator: 'Mitsuhiro Arita',
      dexId: [6],
      regulationMark: null,
      trainerType: null,
      energyType: null,
    });
  });

  it('preenche ausentes com null ou lista vazia', () => {
    const ultraBall = {
      id: 'sv01-196',
      name: 'Ultra Ball',
      number: '196/198',
      category: 'Trainer',
      trainerType: 'Item',
      set: { id: 'sv01', name: 'Scarlet & Violet' },
    };

    const record = toCardRecord(ultraBall);

    expect(record.setSeries).toBeNull();
    expect(record.releaseDate).toBeNull();
    expect(record.imageUrl).toBeNull();
    expect(record.types).toEqual([]);
    expect(record.dexId).toEqual([]);
    expect(record.hp).toBeNull();
    expect(record.trainerType).toBe('Item');
  });
});
