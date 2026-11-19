import { describe, expect, it } from "vitest";
import { temPalavra, usernameValido } from "./filtrosMarketplace";

describe("temPalavra", () => {
  it("recusa uma letra só", () => {
    expect(temPalavra("a")).toBe(false);
  });

  it("aceita duas letras", () => {
    expect(temPalavra("pi")).toBe(true);
  });

  it("recusa só espaços", () => {
    expect(temPalavra("  ")).toBe(false);
  });

  it("recusa só pontuação", () => {
    expect(temPalavra("!!")).toBe(false);
  });

  it("aceita quando alguma palavra tem duas letras", () => {
    expect(temPalavra("a pikachu")).toBe(true);
  });
});

describe("usernameValido", () => {
  it("aceita minúsculas", () => {
    expect(usernameValido("ash")).toBe(true);
  });

  it("recusa menos de 3 caracteres", () => {
    expect(usernameValido("as")).toBe(false);
  });

  it("recusa maiúscula", () => {
    expect(usernameValido("Ash")).toBe(false);
  });

  it("aceita números e _", () => {
    expect(usernameValido("ash_01")).toBe(true);
  });

  it("recusa mais de 20 caracteres", () => {
    expect(usernameValido("a".repeat(21))).toBe(false);
  });
});
