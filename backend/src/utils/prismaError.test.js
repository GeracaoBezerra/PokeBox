import { translatePrismaError } from './prismaError.js';

const prismaError = (code, meta = {}) => ({ name: 'PrismaClientKnownRequestError', code, meta });

describe('translatePrismaError', () => {
  it('duplicidade (P2002) vira 409', () => {
    expect(translatePrismaError(prismaError('P2002'))).toEqual({
      statusCode: 409,
      message: 'Registro duplicado',
    });
  });

  it('chave estrangeira (P2003) vira 409', () => {
    expect(translatePrismaError(prismaError('P2003')).statusCode).toBe(409);
  });

  it('registro não encontrado (P2025) vira 404', () => {
    expect(translatePrismaError(prismaError('P2025')).statusCode).toBe(404);
  });

  it('violação de CHECK (Postgres 23514) vira 422', () => {
    const err = prismaError('P2039', {
      driverAdapterError: { cause: { originalCode: '23514', kind: 'postgres' } },
    });

    expect(translatePrismaError(err).statusCode).toBe(422);
  });

  it('outro erro do Prisma devolve null', () => {
    const err = prismaError('P2039', {
      driverAdapterError: { cause: { originalCode: '40001' } },
    });

    expect(translatePrismaError(err)).toBeNull();
  });

  it('erro que não é do Prisma devolve null', () => {
    expect(translatePrismaError(new Error('boom'))).toBeNull();
    expect(translatePrismaError(undefined)).toBeNull();
  });
});
