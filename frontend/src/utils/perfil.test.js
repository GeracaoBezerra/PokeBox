import { describe, expect, it } from "vitest";
import { UFS, montarMudancas, validarPerfil } from "./perfil";

const valido = {
  name: "Ash Ketchum",
  phone: "(11) 91234-5678",
  cep: "01001-000",
  street: "Praça da Sé",
  number: "10",
  complement: "",
  neighborhood: "Sé",
  city: "São Paulo",
  state: "SP",
};

describe("UFS", () => {
  it("tem as 27 siglas", () => {
    expect(UFS).toHaveLength(27);
  });
});

describe("validarPerfil", () => {
  it("aceita dados válidos com máscara", () => {
    expect(validarPerfil(valido)).toEqual({});
  });

  it("aceita telefone, CEP e UF vazios", () => {
    expect(validarPerfil({ ...valido, phone: "", cep: null, state: "" })).toEqual({});
  });

  it("recusa telefone curto", () => {
    expect(validarPerfil({ ...valido, phone: "(11) 9123-4" })).toEqual({ phone: "Telefone com DDD: 10 ou 11 dígitos" });
  });

  it("recusa CEP com 7 dígitos", () => {
    expect(validarPerfil({ ...valido, cep: "0100100" })).toEqual({ cep: "CEP com 8 dígitos" });
  });

  it("recusa UF que não existe", () => {
    expect(validarPerfil({ ...valido, state: "XX" })).toEqual({ state: "Escolha uma das siglas da lista" });
  });

  it("recusa nome curto e textos longos demais", () => {
    expect(validarPerfil({ ...valido, name: " A ", number: "12345678901" })).toEqual({
      name: "Nome com 2 a 120 caracteres",
      number: "No máximo 10 caracteres",
    });
  });
});

describe("montarMudancas", () => {
  const atual = { name: "Ash Ketchum", phone: "11912345678", cep: "01001000", street: "Praça da Sé", state: "SP" };

  it("não vê mudança quando só a máscara é diferente", () => {
    expect(montarMudancas({ ...atual, phone: "(11) 91234-5678", cep: "01001-000" }, atual)).toEqual({});
  });

  it("manda telefone e CEP só com dígitos", () => {
    expect(montarMudancas({ ...atual, phone: "(21) 98888-7777", cep: "20040-020" }, atual)).toEqual({
      phone: "21988887777",
      cep: "20040020",
    });
  });

  it("manda null quando o campo fica vazio", () => {
    expect(montarMudancas({ ...atual, phone: "", street: "  " }, atual)).toEqual({ phone: null, street: null });
  });

  it("ignora campos que não são editáveis", () => {
    expect(montarMudancas({ ...atual, email: "outro@pokebox.dev" }, atual)).toEqual({});
  });
});
