import { toCardRecord, toCardResponse, toMarketPriceFields } from './cardRecord.js';

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
  marketPrice: { source: 'tcgplayer', value: 312.5, currency: 'USD' },
};

const now = new Date('2026-11-05T12:00:00Z');

describe('toCardRecord', () => {
  it('converte a ficha da carta na linha da tabela Card', () => {
    expect(toCardRecord(charizard, now)).toEqual({
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
      marketPrice: 312.5,
      marketPriceCurrency: 'USD',
      marketPriceSource: 'tcgplayer',
      marketPriceUpdatedAt: now,
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
    expect(record.marketPrice).toBeNull();
    expect(record.marketPriceCurrency).toBeNull();
    expect(record.marketPriceSource).toBeNull();
    expect(record.marketPriceUpdatedAt).toBeNull();
  });
});

describe('toMarketPriceFields', () => {
  it('usa a data do preço na fonte quando a TCGdex informa', () => {
    const marketPrice = { source: 'tcgplayer', value: 1, currency: 'USD', updatedAt: '2026-11-04T10:00:00.000Z' };

    expect(toMarketPriceFields(marketPrice, now).marketPriceUpdatedAt).toEqual(new Date('2026-11-04T10:00:00.000Z'));
  });

  it('converte o preço da TCGdex nas colunas da Card', () => {
    const marketPrice = { source: 'cardmarket', value: 4.2, currency: 'EUR' };

    expect(toMarketPriceFields(marketPrice, now)).toEqual({
      marketPrice: 4.2,
      marketPriceCurrency: 'EUR',
      marketPriceSource: 'cardmarket',
      marketPriceUpdatedAt: now,
    });
  });

  it('zera as colunas quando a carta não tem preço', () => {
    expect(toMarketPriceFields(null)).toEqual({
      marketPrice: null,
      marketPriceCurrency: null,
      marketPriceSource: null,
      marketPriceUpdatedAt: null,
    });
  });
});

describe('toCardResponse', () => {
  it('converte o Decimal do banco em número', () => {
    expect(toCardResponse({ id: 'base1-4', marketPrice: '312.5' })).toEqual({ id: 'base1-4', marketPrice: 312.5 });
  });

  it('mantém null quando não há preço', () => {
    expect(toCardResponse({ id: 'sv01-196', marketPrice: null }).marketPrice).toBeNull();
  });
});
