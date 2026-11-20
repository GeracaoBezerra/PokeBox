import { pendingFirst, type PendingFirstSource } from './pendingFirst.js';

const PENDING = ['p1', 'p2', 'p3'];
const OTHERS = ['o1', 'o2', 'o3', 'o4'];

function source(): PendingFirstSource<string> {
  return {
    find: async (pending, { skip = 0, take }) => {
      const list = pending ? PENDING : OTHERS;
      return list.slice(skip, take === undefined ? undefined : skip + take);
    },
    countPending: async () => PENDING.length,
  };
}

describe('pendingFirst', () => {
  test('sem paginação: pendentes e depois as outras', async () => {
    await expect(pendingFirst(source(), {})).resolves.toEqual([...PENDING, ...OTHERS]);
  });

  test('página que cabe só nas pendentes', async () => {
    await expect(pendingFirst(source(), { skip: 0, take: 2 })).resolves.toEqual(['p1', 'p2']);
  });

  test('página que junta o fim das pendentes com o começo das outras', async () => {
    await expect(pendingFirst(source(), { skip: 2, take: 3 })).resolves.toEqual(['p3', 'o1', 'o2']);
  });

  test('página só com as outras continua de onde parou', async () => {
    await expect(pendingFirst(source(), { skip: 5, take: 3 })).resolves.toEqual(['o3', 'o4']);
  });

  test('as páginas em sequência não repetem nem pulam', async () => {
    const pages = await Promise.all([0, 2, 4, 6].map((skip) => pendingFirst(source(), { skip, take: 2 })));
    expect(pages.flat()).toEqual([...PENDING, ...OTHERS]);
  });
});
