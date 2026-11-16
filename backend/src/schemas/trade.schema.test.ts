import { createTradeSchema, listTradesQuerySchema, tradeIdSchema } from './trade.schema.js';

const uuid = 'f323730d-c965-42b2-b3f4-000000000001';

describe('createTradeSchema', () => {
  it('aceita offerId uuid', () => {
    expect(createTradeSchema.safeParse({ offerId: uuid }).success).toBe(true);
  });

  it('recusa sem offerId', () => {
    expect(createTradeSchema.safeParse({}).success).toBe(false);
  });

  it('recusa offerId que não é uuid', () => {
    expect(createTradeSchema.safeParse({ offerId: 'abc' }).success).toBe(false);
  });

  it('recusa campo a mais', () => {
    expect(createTradeSchema.safeParse({ offerId: uuid, quantity: 1 }).success).toBe(false);
  });
});

describe('listTradesQuerySchema', () => {
  it('sem parâmetros não pagina', () => {
    expect(listTradesQuerySchema.parse({})).toEqual({ filters: {}, page: null });
  });

  it('status sozinho não pagina', () => {
    expect(listTradesQuerySchema.parse({ status: 'ACCEPTED' })).toEqual({ filters: { status: 'ACCEPTED' }, page: null });
  });

  it('side pagina na página 1 com 20 itens', () => {
    expect(listTradesQuerySchema.parse({ side: 'sent' })).toEqual({ filters: { side: 'sent' }, page: { page: 1, limit: 20 } });
  });

  it('recusa page sem side', () => {
    expect(listTradesQuerySchema.safeParse({ page: '1' }).error?.issues[0].path).toEqual(['side']);
  });

  it.each(['PROPOSED', 'ACCEPTED', 'REJECTED', 'CANCELED'])('aceita status %s', (status) => {
    expect(listTradesQuerySchema.safeParse({ status }).success).toBe(true);
  });

  it('recusa status desconhecido', () => {
    expect(listTradesQuerySchema.safeParse({ status: 'OPEN' }).success).toBe(false);
  });
});

describe('tradeIdSchema', () => {
  it('recusa id que não é uuid', () => {
    expect(tradeIdSchema.safeParse({ id: '123' }).success).toBe(false);
  });
});
