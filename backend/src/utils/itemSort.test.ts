import { itemOrderBy } from './itemSort.js';

describe('itemOrderBy', () => {
  it('sem sort ordena pelo nome da carta, depois entrada e id', () => {
    expect(itemOrderBy()).toEqual([{ card: { name: 'asc' } }, { createdAt: 'asc' }, { id: 'asc' }]);
  });

  it('name é o mesmo que sem sort', () => {
    expect(itemOrderBy('name')).toEqual(itemOrderBy());
  });

  it('recent põe a entrada mais nova primeiro, com id de desempate', () => {
    expect(itemOrderBy('recent')).toEqual([{ createdAt: 'desc' }, { id: 'asc' }]);
  });

  it('devolve uma lista nova a cada chamada', () => {
    expect(itemOrderBy()).not.toBe(itemOrderBy());
  });
});
