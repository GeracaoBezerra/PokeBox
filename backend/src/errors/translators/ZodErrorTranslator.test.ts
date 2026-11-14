import { z } from 'zod';

import { ZodErrorTranslator } from './ZodErrorTranslator.js';

const translator = new ZodErrorTranslator();

describe('ZodErrorTranslator', () => {
  it('erro do zod vira 400 com os campos em details', () => {
    const result = z.object({ email: z.string() }).safeParse({});

    expect(translator.translate(result.error)).toEqual({
      statusCode: 400,
      message: 'Dados inválidos',
      details: [{ field: 'email', message: expect.any(String) }],
    });
  });

  it('erro qualquer devolve null', () => {
    expect(translator.translate(new Error('boom'))).toBeNull();
  });
});
