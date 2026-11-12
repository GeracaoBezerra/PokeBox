import { BodyParserErrorTranslator } from './BodyParserErrorTranslator.js';

const translator = new BodyParserErrorTranslator();

describe('BodyParserErrorTranslator', () => {
  it('JSON malformado vira 400', () => {
    expect(translator.translate({ type: 'entity.parse.failed' })).toEqual({
      statusCode: 400,
      message: 'JSON inválido',
    });
  });

  it('corpo grande demais vira 413', () => {
    expect(translator.translate({ type: 'entity.too.large' })).toEqual({
      statusCode: 413,
      message: 'Corpo da requisição grande demais',
    });
  });

  it('outro erro não é traduzido', () => {
    expect(translator.translate(new Error('x'))).toBeNull();
    expect(translator.translate(undefined)).toBeNull();
  });
});
