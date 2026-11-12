import { jest } from '@jest/globals';

import { CardNotFoundError } from '../CardNotFoundError.js';
import { TcgdexUnavailableError } from '../TcgdexUnavailableError.js';
import { TcgdexErrorTranslator } from './TcgdexErrorTranslator.js';

const logger = { error: jest.fn() };
const translator = new TcgdexErrorTranslator(logger);

beforeEach(() => logger.error.mockClear());

describe('TcgdexErrorTranslator', () => {
  it('TCGdex indisponível vira 502', () => {
    expect(translator.translate(new TcgdexUnavailableError('TCGdex respondeu 503'))).toEqual({
      statusCode: 502,
      message: 'Serviço de cartas indisponível no momento. Tente novamente em instantes',
    });
  });

  it('TCGdex demorou demais vira 504', () => {
    const err = new TcgdexUnavailableError('TCGdex não respondeu a tempo', { timeout: true });

    expect(translator.translate(err)).toEqual({
      statusCode: 504,
      message: 'O serviço de cartas demorou para responder. Tente novamente em instantes',
    });
  });

  it('guarda a causa original', () => {
    const cause = new TypeError('fetch failed');
    const err = new TcgdexUnavailableError('Falha ao chamar a TCGdex', { cause });

    expect(err.cause).toBe(cause);
    expect(err.timeout).toBe(false);
  });

  it('erro qualquer devolve null', () => {
    expect(translator.translate(new Error('boom'))).toBeNull();
    expect(translator.translate(undefined)).toBeNull();
  });

  it('carta não encontrada devolve null', () => {
    expect(translator.translate(new CardNotFoundError('Carta x não encontrada'))).toBeNull();
  });

  it('registra no log quando a TCGdex está fora', () => {
    translator.translate(new TcgdexUnavailableError('TCGdex respondeu 503'));

    expect(logger.error).toHaveBeenCalledWith('[TCGdex indisponível]', 'TCGdex respondeu 503');
  });
});
