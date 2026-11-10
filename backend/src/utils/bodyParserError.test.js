import { translateBodyParserError } from './bodyParserError.js';

describe('translateBodyParserError', () => {
  it('JSON malformado vira 400', () => {
    expect(translateBodyParserError({ type: 'entity.parse.failed' })).toEqual({
      statusCode: 400,
      message: 'JSON inválido',
    });
  });

  it('corpo grande demais vira 413', () => {
    expect(translateBodyParserError({ type: 'entity.too.large' })).toEqual({
      statusCode: 413,
      message: 'Corpo da requisição grande demais',
    });
  });

  it('outro erro não é traduzido', () => {
    expect(translateBodyParserError(new Error('x'))).toBeNull();
    expect(translateBodyParserError(undefined)).toBeNull();
  });
});
