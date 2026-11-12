import { AppError } from '../AppError.js';
import { ConflictError, ForbiddenError, NotFoundError, UnprocessableError } from '../domainErrors.js';
import { AppErrorTranslator } from './AppErrorTranslator.js';

const translator = new AppErrorTranslator();

describe('AppErrorTranslator', () => {
  it('usa o status e a mensagem do AppError', () => {
    expect(translator.translate(new AppError(409, 'Já existe'))).toEqual({
      statusCode: 409,
      message: 'Já existe',
    });
  });

  it('repassa details quando o erro traz', () => {
    expect(translator.translate(new AppError(422, 'Inválido', { campo: 'x' }))).toEqual({
      statusCode: 422,
      message: 'Inválido',
      details: { campo: 'x' },
    });
  });

  it.each([
    [new NotFoundError('x'), 404],
    [new ForbiddenError('x'), 403],
    [new ConflictError('x'), 409],
    [new UnprocessableError('x'), 422],
  ])('erro de domínio %p vira %i', (err, statusCode) => {
    expect(translator.translate(err)?.statusCode).toBe(statusCode);
  });

  it('erro qualquer devolve null', () => {
    expect(translator.translate(new Error('boom'))).toBeNull();
  });
});
