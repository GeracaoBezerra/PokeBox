import { describe, expect, it } from "vitest";
import { formatarData, precoReferencia, variante } from "./rotulos";

describe("variante", () => {
  it("junta acabamento e primeira edição", () => {
    expect(variante({ finish: "HOLO", firstEdition: true })).toBe("Holo · 1ª edição");
  });

  it("mostra só o acabamento quando não é primeira edição", () => {
    expect(variante({ finish: "REVERSE", firstEdition: false })).toBe("Reverse");
  });

  it("devolve o valor original quando o acabamento é desconhecido", () => {
    expect(variante({ finish: "GOLD", firstEdition: false })).toBe("GOLD");
  });
});

describe("formatarData", () => {
  it("devolve texto vazio sem data", () => {
    expect(formatarData("")).toBe("");
  });

  it("formata no padrão brasileiro", () => {
    expect(formatarData("2026-11-17T15:00:00Z")).toBe("17/11/2026");
  });
});

describe("precoReferencia", () => {
  it("devolve null sem preço", () => {
    expect(precoReferencia({ marketPrice: null, marketPriceCurrency: "EUR", marketPriceSource: "cardmarket" })).toBeNull();
  });

  it("devolve null sem moeda", () => {
    expect(precoReferencia({ marketPrice: 10, marketPriceCurrency: null, marketPriceSource: "cardmarket" })).toBeNull();
  });

  it("cita o Cardmarket quando o preço vem de lá", () => {
    const texto = precoReferencia({ marketPrice: 10, marketPriceCurrency: "EUR", marketPriceSource: "cardmarket" });
    expect(texto).toMatch(/€\s?10,00/);
    expect(texto).toContain("referência Cardmarket");
  });

  it("cita o TCGplayer quando o preço vem de lá", () => {
    const texto = precoReferencia({ marketPrice: "10", marketPriceCurrency: "BRL", marketPriceSource: "tcgplayer" });
    expect(texto).toMatch(/R\$\s?10,00/);
    expect(texto).toContain("referência TCGplayer");
  });
});
