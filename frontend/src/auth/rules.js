export const loginRules = {
  email: [
    (v) => (v ? null : "Informe seu e-mail."),
    (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? null : "E-mail inválido."),
  ],
  password: [
    (v) => (v ? null : "Informe sua senha."),
    (v) => (v.length >= 6 ? null : "Mínimo de 6 caracteres."),
  ],
};

export const registerRules = {
  name: [
    (v) => (v ? null : "Informe seu nome."),
    (v) => (v.length >= 2 ? null : "Nome muito curto."),
    (v) => (v.length <= 80 ? null : "Nome muito longo."),
  ],
  username: [
  (v) => (v ? null : "Escolha um nome de usuário."),
  (v) =>
    /^[a-z0-9_]{3,20}$/.test(v)
      ? null
      : "Use 3–20 caracteres: letras minúsculas, números ou _.",
],
  email: [
    (v) => (v ? null : "Informe seu e-mail."),
    (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? null : "E-mail inválido."),
  ],
  password: [
  (v) => (v ? null : "Informe sua senha."),
  (v) => (v.length >= 8 ? null : "Mínimo de 8 caracteres."),
  (v) => (v.length <= 72 ? null : "Máximo de 72 caracteres."),
],
  confirmPassword: [
    (v) => (v ? null : "Confirme sua senha."),
    (v, all) => (v === all?.password ? null : "As senhas não coincidem."),
  ],
};
