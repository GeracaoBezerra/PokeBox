import { jest } from '@jest/globals';

import { cardMock } from '../../mocks/cardMock.js';
import type { CardDetail } from '../types.js';
import type { CardCatalog } from './CardCatalog.js';
import { InFlightDedupCatalog } from './InFlightDedupCatalog.js';

function deferred() {
  let resolve: (card: CardDetail) => void = () => {};
  let reject: (err: unknown) => void = () => {};
  const promise = new Promise<CardDetail>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function fakeCatalog(): jest.Mocked<CardCatalog> {
  return {
    getById: jest.fn<CardCatalog['getById']>(),
    search: jest.fn<CardCatalog['search']>(async () => []),
    listSets: jest.fn<CardCatalog['listSets']>(async () => []),
    listSetCards: jest.fn<CardCatalog['listSetCards']>(async () => []),
  };
}

describe('InFlightDedupCatalog', () => {
  test('pedidos iguais ao mesmo tempo viram uma chamada só', async () => {
    const inner = fakeCatalog();
    const pending = deferred();
    inner.getById.mockReturnValue(pending.promise);
    const catalog = new InFlightDedupCatalog(inner);

    const first = catalog.getById('base1-4', 'en');
    const second = catalog.getById('base1-4', 'en');
    pending.resolve(cardMock);

    await expect(first).resolves.toBe(cardMock);
    await expect(second).resolves.toBe(cardMock);
    expect(inner.getById).toHaveBeenCalledTimes(1);
  });

  test('depois de terminar, o próximo pedido chama de novo', async () => {
    const inner = fakeCatalog();
    inner.getById.mockResolvedValue(cardMock);
    const catalog = new InFlightDedupCatalog(inner);

    await catalog.getById('base1-4', 'en');
    await catalog.getById('base1-4', 'en');

    expect(inner.getById).toHaveBeenCalledTimes(2);
  });

  test('idiomas diferentes não se juntam', async () => {
    const inner = fakeCatalog();
    inner.getById.mockResolvedValue(cardMock);
    const catalog = new InFlightDedupCatalog(inner);

    await Promise.all([catalog.getById('base1-4', 'en'), catalog.getById('base1-4', 'pt')]);

    expect(inner.getById).toHaveBeenCalledTimes(2);
  });

  test('erro chega a todos que esperavam e libera a chave', async () => {
    const inner = fakeCatalog();
    const pending = deferred();
    inner.getById.mockReturnValueOnce(pending.promise).mockResolvedValueOnce(cardMock);
    const catalog = new InFlightDedupCatalog(inner);

    const first = catalog.getById('base1-4', 'en');
    const second = catalog.getById('base1-4', 'en');
    pending.reject(new Error('fora'));

    await expect(first).rejects.toThrow('fora');
    await expect(second).rejects.toThrow('fora');
    await expect(catalog.getById('base1-4', 'en')).resolves.toBe(cardMock);
  });
});
