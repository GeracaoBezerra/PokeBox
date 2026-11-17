import { conditionFilter, finishFilter, typeFilter } from './cardFilters.schema.js';

describe('filtros repetidos na query string', () => {
  it.each([
    ['condition', conditionFilter],
    ['finish', finishFilter],
    ['type', typeFilter],
  ] as const)('%s com dois valores (?x=a&x=b) é recusado', (_name, filter) => {
    expect(filter.safeParse(['a', 'b']).success).toBe(false);
  });
});
