import { PrismaErrorTranslator } from './PrismaErrorTranslator.js';

const translator = new PrismaErrorTranslator();

const prismaError = (code: string, meta: object = {}) => ({ name: 'PrismaClientKnownRequestError', code, meta });

describe('PrismaErrorTranslator', () => {
  it('duplicidade (P2002) vira 409', () => {
    expect(translator.translate(prismaError('P2002'))).toEqual({
      statusCode: 409,
      message: 'Registro duplicado',
    });
  });

  it('chave estrangeira (P2003) vira 409', () => {
    expect(translator.translate(prismaError('P2003'))?.statusCode).toBe(409);
  });

  it('registro não encontrado (P2025) vira 404', () => {
    expect(translator.translate(prismaError('P2025'))?.statusCode).toBe(404);
  });

  it('violação de CHECK (Postgres 23514) vira 422', () => {
    const err = prismaError('P2039', {
      driverAdapterError: { cause: { originalCode: '23514', kind: 'postgres' } },
    });

    expect(translator.translate(err)?.statusCode).toBe(422);
  });

  it('outro erro do Prisma devolve null', () => {
    const err = prismaError('P2039', {
      driverAdapterError: { cause: { originalCode: '40001' } },
    });

    expect(translator.translate(err)).toBeNull();
  });

  it('erro que não é do Prisma devolve null', () => {
    expect(translator.translate(new Error('boom'))).toBeNull();
    expect(translator.translate(undefined)).toBeNull();
  });
});
