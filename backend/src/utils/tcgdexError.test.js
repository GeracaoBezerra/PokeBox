import { TcgdexUnavailableError, translateTcgdexError } from './tcgdexError.js';
import { CardNotFoundError } from '../repositories/tcgdexRepository.js';

describe('translateTcgdexError', () => {
  it('TCGdex indisponível vira 502', () => {
    expect(translateTcgdexError(new TcgdexUnavailableError('TCGdex respondeu 503'))).toEqual({
      statusCode: 502,
      message: 'Serviço de cartas indisponível no momento. Tente novamente em instantes',
    });
  });

  it('TCGdex demorou demais vira 504', () => {
    const err = new TcgdexUnavailableError('TCGdex não respondeu a tempo', { timeout: true });

    expect(translateTcgdexError(err)).toEqual({
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
    expect(translateTcgdexError(new Error('boom'))).toBeNull();
    expect(translateTcgdexError(undefined)).toBeNull();
  });

  it('carta não encontrada devolve null', () => {
    expect(translateTcgdexError(new CardNotFoundError('Carta x não encontrada'))).toBeNull();
  });
});
