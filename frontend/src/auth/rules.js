
const EMAIL_REGEX =
  /^(?!\.)(?!.*\.\.)([A-Za-z0-9_'+\-.]*)[A-Za-z0-9_+-]@([A-Za-z0-9][A-Za-z0-9-]*\.)+[A-Za-z]{2,}$/;

const LIMITS = {
  name: { min: 2, max: 120 },
  password: { min: 8, max: 72 },
};

const emailRules = [
  (v) => (v ? null : "Informe seu e-mail."),
  (v) => (EMAIL_REGEX.test(v) ? null : "E-mail inválido."),
];

export const loginRules = {
  email: emailRules,
  
  password: [(v) => (v ? null : "Informe sua senha.")],
};

export const registerRules = {
  name: [
    (v) => (v ? null : "Informe seu nome."),
    (v) => (v.length >= LIMITS.name.min ? null : "Nome muito curto."),
    (v) => (v.length <= LIMITS.name.max ? null : "Nome muito longo."),
  ],
  username: [
    (v) => (v ? null : "Escolha um nome de usuário."),
    (v) =>
      /^[a-z0-9_]{3,20}$/.test(v)
        ? null
        : "Use 3–20 caracteres: letras minúsculas, números ou _.",
  ],
  email: emailRules,
  password: [
    (v) => (v ? null : "Informe sua senha."),
    (v) =>
      v.length >= LIMITS.password.min
        ? null
        : `Mínimo de ${LIMITS.password.min} caracteres.`,
    (v) =>
      v.length <= LIMITS.password.max
        ? null
        : `Máximo de ${LIMITS.password.max} caracteres.`,
  ],
  confirmPassword: [
    (v) => (v ? null : "Confirme sua senha."),
    (v, all) => (v === all?.password ? null : "As senhas não coincidem."),
  ],
};