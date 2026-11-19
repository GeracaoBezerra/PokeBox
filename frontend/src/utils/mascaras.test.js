import { describe, expect, it } from "vitest";
import { mascararCep, mascararTelefone, soDigitos } from "./mascaras";

describe("soDigitos", () => {
  it("tira tudo que não é número", () => {
    expect(soDigitos("(11) 91234-5678")).toBe("11912345678");
  });

  it("devolve texto vazio para null e undefined", () => {
    expect(soDigitos(null)).toBe("");
    expect(soDigitos(undefined)).toBe("");
  });
});

describe("mascararTelefone", () => {
  it("formata celular com 11 dígitos", () => {
    expect(mascararTelefone("11912345678")).toBe("(11) 91234-5678");
  });

  it("formata fixo com 10 dígitos", () => {
    expect(mascararTelefone("1132345678")).toBe("(11) 3234-5678");
  });

  it("formata enquanto a pessoa digita", () => {
    expect(mascararTelefone("1")).toBe("(1");
    expect(mascararTelefone("119")).toBe("(11) 9");
    expect(mascararTelefone("1191234")).toBe("(11) 9123-4");
  });

  it("corta o que passa de 11 dígitos e ignora letras", () => {
    expect(mascararTelefone("11a9123456789")).toBe("(11) 91234-5678");
  });

  it("devolve vazio sem dígitos", () => {
    expect(mascararTelefone("")).toBe("");
    expect(mascararTelefone(null)).toBe("");
  });
});

describe("mascararCep", () => {
  it("põe o hífen depois do quinto dígito", () => {
    expect(mascararCep("01001000")).toBe("01001-000");
  });

  it("não põe hífen com até 5 dígitos", () => {
    expect(mascararCep("01001")).toBe("01001");
  });

  it("corta o que passa de 8 dígitos", () => {
    expect(mascararCep("010010009")).toBe("01001-000");
  });
});
