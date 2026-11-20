import { describe, expect, it } from "vitest";
import { loginRules, registerRules } from "./rules";
import { Validator } from "./validator";

describe("Validator com as regras de login", () => {
  const validator = new Validator(loginRules);

  it("aceita e-mail e senha preenchidos", () => {
    expect(validator.validate({ email: "ash@pokebox.dev", password: "qualquer" })).toEqual({});
  });

  it("pede e-mail e senha quando estão vazios", () => {
    expect(validator.validate({})).toEqual({
      email: "Informe seu e-mail.",
      password: "Informe sua senha.",
    });
  });

  it("recusa e-mail sem domínio", () => {
    expect(validator.validate({ email: "ash@", password: "x" }).email).toBe("E-mail inválido.");
  });
});

describe("Validator com as regras de cadastro", () => {
  const validator = new Validator(registerRules);
  const valido = {
    name: "Ash Ketchum",
    username: "ash_ketchum",
    email: "ash@pokebox.dev",
    password: "senha-forte",
    confirmPassword: "senha-forte",
  };

  it("aceita um cadastro válido", () => {
    expect(validator.validate(valido)).toEqual({});
  });

  it("aceita senha com exatamente 8 caracteres", () => {
    expect(validator.validate({ ...valido, password: "12345678", confirmPassword: "12345678" })).toEqual({});
  });

  it("recusa senha com menos de 8 caracteres", () => {
    expect(validator.validate({ ...valido, password: "1234567", confirmPassword: "1234567" }).password)
      .toBe("Mínimo de 8 caracteres.");
  });

  it("recusa senha com mais de 72 caracteres", () => {
    const longa = "a".repeat(73);
    expect(validator.validate({ ...valido, password: longa, confirmPassword: longa }).password)
      .toBe("Máximo de 72 caracteres.");
  });

  it("recusa nome com uma letra só", () => {
    expect(validator.validate({ ...valido, name: "A" }).name).toBe("Nome muito curto.");
  });

  it("recusa username com letra maiúscula", () => {
    expect(validator.validate({ ...valido, username: "Ash" }).username)
      .toBe("Use 3–20 caracteres: letras minúsculas, números ou _.");
  });

  it("avisa quando a confirmação não bate", () => {
    expect(validator.validate({ ...valido, confirmPassword: "outra-senha" }).confirmPassword)
      .toBe("As senhas não coincidem.");
  });

  it("mostra só o primeiro erro de cada campo", () => {
    expect(validator.validate({ ...valido, email: "" }).email).toBe("Informe seu e-mail.");
  });
});
