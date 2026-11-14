import { cardMock } from '../../mocks/cardMock.js';
import { MockCatalog } from './MockCatalog.js';

describe('MockCatalog', () => {
  const catalog = new MockCatalog();

  test('detalhe devolve a carta falsa', async () => {
    await expect(catalog.getById()).resolves.toBe(cardMock);
  });

  test('lista devolve a carta falsa com set e number, sem search', async () => {
    await expect(catalog.find()).resolves.toEqual({
      cards: [
        {
          id: 'base1-4',
          localId: '4',
          number: '4',
          name: 'Charizard',
          set: { id: 'base1', name: 'Base Set' },
          image: cardMock.image,
        },
      ],
      hasNextPage: false,
      search: null,
    });
  });
});
