import {
  matchSets,
  nameMatchesAny,
  normalizeText,
  rankCards,
  scoreCard,
  setIdFromCardId,
  toCardListItem,
  tokenize,
} from './cardSearch.js';

const sets = [
  { id: 'base1', name: 'Base Set' },
  { id: 'base2', name: 'Jungle' },
  { id: 'base4', name: 'Base Set 2' },
  { id: 'ecard1', name: 'Expedition Base Set' },
  { id: 'sv03', name: 'Obsidian Flames' },
  { id: 'sv03.5', name: '151' },
  { id: 'tk-ex-latio', name: 'EX trainer Kit (Latios)' },
];

const card = (id, name) => ({ id, localId: id.split('-').pop(), name, image: { small: null, large: null } });

describe('normalizeText', () => {
  it('tira acento, deixa em minúsculas e corta espaços das pontas', () => {
    expect(normalizeText('  Pokémon Évoli ')).toBe('pokemon evoli');
  });

  it('aceita null e undefined', () => {
    expect(normalizeText(undefined)).toBe('');
    expect(normalizeText(null)).toBe('');
  });
});

describe('tokenize', () => {
  it('quebra em espaços e descarta palavras com menos de 2 letras', () => {
    expect(tokenize('Charizard  Base x')).toEqual(['charizard', 'base']);
  });

  it('tira acentos', () => {
    expect(tokenize('Pokémon Évoli')).toEqual(['pokemon', 'evoli']);
  });

  it('texto vazio ou só com espaços vira lista vazia', () => {
    expect(tokenize('')).toEqual([]);
    expect(tokenize('   ')).toEqual([]);
    expect(tokenize(undefined)).toEqual([]);
  });

  it('mantém números e pontuação dentro da palavra', () => {
    expect(tokenize('Pikachu 25 sv03.5 Ho-Oh')).toEqual(['pikachu', '25', 'sv03.5', 'ho-oh']);
  });
});

describe('matchSets', () => {
  it('"base" bate com Base Set e Base Set 2, e "charizard" sobra', () => {
    const result = matchSets(['charizard', 'base'], sets);

    expect(result.sets.map((set) => set.id)).toEqual(['base1', 'base4', 'ecard1']);
    expect(result.used).toEqual(['base']);
    expect(result.complete).toEqual([]);
  });

  it('marca como completas as palavras de um set coberto inteiro', () => {
    expect(matchSets(['jungle'], sets).complete).toEqual(['jungle']);
    expect(matchSets(['base', 'set'], sets).complete).toEqual(['base', 'set']);
  });

  it('palavra que não é set não reconhece nada', () => {
    expect(matchSets(['pikachu'], sets)).toEqual({ sets: [], used: [], complete: [] });
  });

  it('reconhece pelo id do set', () => {
    const result = matchSets(['charizard', 'sv03.5'], sets);

    expect(result.sets.map((set) => set.id)).toEqual(['sv03.5']);
    expect(result.used).toEqual(['sv03.5']);
    expect(result.complete).toEqual(['sv03.5']);
  });

  it('o set com mais palavras cobertas vem primeiro', () => {
    const result = matchSets(['expedition', 'base', 'set'], sets);

    expect(result.sets[0].id).toBe('ecard1');
    expect(result.used).toEqual(expect.arrayContaining(['expedition', 'base', 'set']));
  });

  it('não casa pedaço de palavra', () => {
    expect(matchSets(['bas', 'jung'], sets).sets).toEqual([]);
  });

  it('limita a 3 sets', () => {
    expect(matchSets(['base', 'set'], sets).sets).toHaveLength(3);
  });
});

describe('setIdFromCardId', () => {
  it('escolhe o set mais longo quando o id tem ponto', () => {
    expect(setIdFromCardId('sv03.5-6', ['sv03', 'sv03.5'])).toBe('sv03.5');
  });

  it('não confunde sv03 com sv03.5', () => {
    expect(setIdFromCardId('sv03-6', ['sv03.5', 'sv03'])).toBe('sv03');
  });

  it('aceita set com hífen no id', () => {
    expect(setIdFromCardId('tk-ex-latio-1', ['tk-ex-latio', 'tk'])).toBe('tk-ex-latio');
  });

  it('devolve null quando nenhum set bate', () => {
    expect(setIdFromCardId('base1-4', ['sv03'])).toBeNull();
  });
});

describe('scoreCard', () => {
  it('soma set, nome igual à frase e palavras contidas', () => {
    const criteria = { nameTokens: ['charizard'], setIds: ['base1'] };

    expect(scoreCard(card('base1-4', 'Charizard'), criteria)).toBe(6);
    expect(scoreCard(card('sv03.5-6', 'Charizard ex'), criteria)).toBe(1);
    expect(scoreCard(card('base1-1', 'Alakazam'), criteria)).toBe(3);
  });

  it('usa a frase completa da busca para o bônus de nome igual', () => {
    const criteria = { nameTokens: ['charizard'], setIds: ['tk-ex-latio'], phrase: 'charizard ex' };

    expect(scoreCard(card('sv03.5-6', 'Charizard ex'), criteria)).toBe(3);
    expect(scoreCard(card('base1-4', 'Charizard'), criteria)).toBe(1);
  });
});

describe('rankCards', () => {
  it('coloca o Charizard do set reconhecido primeiro', () => {
    const cards = [card('sv03.5-6', 'Charizard ex'), card('base1-4', 'Charizard')];

    const ranked = rankCards(cards, { nameTokens: ['charizard'], setIds: ['base1'] });

    expect(ranked.map((item) => item.id)).toEqual(['base1-4', 'sv03.5-6']);
  });

  it('remove ids repetidos', () => {
    const cards = [card('base1-4', 'Charizard'), card('base1-4', 'Charizard'), card('base4-4', 'Charizard')];

    const ranked = rankCards(cards, { nameTokens: ['charizard'], setIds: [] });

    expect(ranked.map((item) => item.id)).toEqual(['base1-4', 'base4-4']);
  });

  it('empate mantém a ordem original', () => {
    const cards = [card('a-1', 'Pikachu'), card('b-1', 'Pikachu'), card('c-1', 'Pikachu')];

    const ranked = rankCards(cards, { nameTokens: ['pikachu'], setIds: [] });

    expect(ranked.map((item) => item.id)).toEqual(['a-1', 'b-1', 'c-1']);
  });
});

describe('nameMatchesAny', () => {
  it('confere se alguma palavra está no nome, sem acento', () => {
    expect(nameMatchesAny('Flabébé', ['flabebe'])).toBe(true);
    expect(nameMatchesAny('Charizard', ['pipi', 'popo'])).toBe(false);
  });
});

describe('toCardListItem', () => {
  it('acrescenta number e o set descoberto pelo id', () => {
    expect(toCardListItem(card('sv03.5-6', 'Charizard ex'), sets)).toEqual({
      id: 'sv03.5-6',
      localId: '6',
      number: '6',
      name: 'Charizard ex',
      set: { id: 'sv03.5', name: '151' },
      image: { small: null, large: null },
    });
  });

  it('set desconhecido vira null', () => {
    expect(toCardListItem(card('xyz9-1', 'Mew'), sets).set).toBeNull();
  });
});
