const BODY_ERRORS = {
  'entity.parse.failed': { statusCode: 400, message: 'JSON inválido' },
  'entity.too.large': { statusCode: 413, message: 'Corpo da requisição grande demais' },
};

export function translateBodyParserError(err) {
  return BODY_ERRORS[err?.type] ?? null;
}
