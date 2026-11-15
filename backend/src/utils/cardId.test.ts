import { isValidCardId } from './cardId.js';

describe('isValidCardId', () => {
  it.each(['base1-4', 'sv03.5-025', 'exu-A', 'swsh12pt5gg-GG01'])('aceita %s', (id) => {
    expect(isValidCardId(id)).toBe(true);
  });

  it.each(['exu-!', 'exu-%3F', 'exu-?', 'base1 4', ''])('recusa "%s"', (id) => {
    expect(isValidCardId(id)).toBe(false);
  });
});
