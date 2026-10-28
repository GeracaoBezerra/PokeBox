import { registerSchema } from './auth.schema.js';

const CHECK_DO_BANCO = /^[a-z0-9_]{3,20}$/;

const CANDIDATOS = [
  'ab',
  'abc',
  'paahdiego',
  'com_underscore',
  'numero123',
  'ComMaiuscula',
  'com-traco',
  'com espaco',
  'com.ponto',
  'a'.repeat(20),
  'a'.repeat(21),
];

function zodAceita(username) {
  return registerSchema.safeParse({
    username,
    name: 'Nome Valido',
    email: 'valido@teste.com',
    password: 'senhaForte123',
  }).success;
}

describe('regra do username', () => {
  it.each(CANDIDATOS)('zod e CHECK do banco concordam sobre "%s"', (username) => {
    expect(zodAceita(username)).toBe(CHECK_DO_BANCO.test(username));
  });
});
