const CHECK_VIOLATION = '23514';

export function translatePrismaError(err) {
  if (err?.name !== 'PrismaClientKnownRequestError') return null;

  if (err.code === 'P2002') return { statusCode: 409, message: 'Registro duplicado' };
  if (err.code === 'P2003') return { statusCode: 409, message: 'Registro em uso por outro recurso' };
  if (err.code === 'P2025') return { statusCode: 404, message: 'Registro não encontrado' };

  const postgresCode = err.meta?.driverAdapterError?.cause?.originalCode;
  if (postgresCode === CHECK_VIOLATION) {
    return { statusCode: 422, message: 'Valor viola uma regra do banco' };
  }

  return null;
}
