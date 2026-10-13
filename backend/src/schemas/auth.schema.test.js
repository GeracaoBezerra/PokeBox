import { registerSchema, loginSchema } from './auth.schema.js';

const payloadValido = {
  username: 'paahdiego',
  name: 'Patrick Silva',
  email: 'patrick@teste.com',
  password: 'senhaForte123',
};

describe('registerSchema', () => {
  it('aceita um payload valido', () => {
    expect(() => registerSchema.parse(payloadValido)).not.toThrow();
  });

  it('normaliza o email para minusculas', () => {
    const resultado = registerSchema.parse({ ...payloadValido, email: 'PATRICK@TESTE.COM' });

    expect(resultado.email).toBe('patrick@teste.com');
  });

  it.each([
    ['curto demais', 'ab'],
    ['com maiuscula', 'PaahDiego'],
    ['com traco', 'paah-diego'],
    ['com espaco', 'paah diego'],
    ['com acento', 'paahdiegô'],
    ['longo demais', 'a'.repeat(21)],
  ])('rejeita username %s', (_descricao, username) => {
    expect(() => registerSchema.parse({ ...payloadValido, username })).toThrow();
  });

  it.each([
    ['sem arroba', 'patrick.teste.com'],
    ['sem dominio', 'patrick@'],
    ['vazio', ''],
  ])('rejeita email %s', (_descricao, email) => {
    expect(() => registerSchema.parse({ ...payloadValido, email })).toThrow();
  });

  it('rejeita senha com menos de 8 caracteres', () => {
    expect(() => registerSchema.parse({ ...payloadValido, password: '1234567' })).toThrow();
  });

  it('rejeita senha acima de 72 caracteres, limite do bcrypt', () => {
    expect(() => registerSchema.parse({ ...payloadValido, password: 'a'.repeat(73) })).toThrow();
  });

  it('rejeita nome formado so por espacos', () => {
    expect(() => registerSchema.parse({ ...payloadValido, name: '   ' })).toThrow();
  });

  it('reporta todos os campos invalidos de uma vez', () => {
    const resultado = registerSchema.safeParse({
      username: 'AB',
      name: 'x',
      email: 'nao-eh-email',
      password: '123',
    });

    const camposComErro = resultado.error.issues.map((issue) => issue.path[0]);

    expect(resultado.success).toBe(false);
    expect(camposComErro).toEqual(
      expect.arrayContaining(['username', 'name', 'email', 'password']),
    );
  });
});

describe('loginSchema', () => {
  it('aceita email e senha', () => {
    expect(() =>
      loginSchema.parse({ email: 'patrick@teste.com', password: 'senhaForte123' }),
    ).not.toThrow();
  });

  it('nao aplica as regras de forca do cadastro na senha', () => {
    expect(() => loginSchema.parse({ email: 'patrick@teste.com', password: 'x' })).not.toThrow();
  });

  it('rejeita senha vazia', () => {
    expect(() => loginSchema.parse({ email: 'patrick@teste.com', password: '' })).toThrow();
  });
});
