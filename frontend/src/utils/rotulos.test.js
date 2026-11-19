import { describe, expect, it } from "vitest";
import {
  contarOfertasAguardando,
  descreverCartas,
  formatarData,
  precoReferencia,
  textoOfertasAguardando,
  variante,
} from "./rotulos";

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

describe("contarOfertasAguardando", () => {
  it("conta só as ofertas do anúncio pedido", () => {
    const recebidas = [{ listing: { id: "a1" } }, { listing: { id: "a2" } }, { listing: { id: "a1" } }];

    expect(contarOfertasAguardando(recebidas, "a1")).toBe(2);
  });

  it("devolve zero sem lista", () => {
    expect(contarOfertasAguardando(undefined, "a1")).toBe(0);
  });
});

describe("textoOfertasAguardando", () => {
  it("avisa quando não há nenhuma", () => {
    expect(textoOfertasAguardando(0)).toBe("Nenhuma oferta aguardando resposta");
  });

  it("usa o singular para uma", () => {
    expect(textoOfertasAguardando(1)).toBe("1 oferta aguardando sua resposta");
  });

  it("usa o plural para várias", () => {
    expect(textoOfertasAguardando(3)).toBe("3 ofertas aguardando sua resposta");
  });
});

describe("descreverCartas", () => {
  it("junta quantidade e nome de cada carta", () => {
    const itens = [
      { quantity: 2, card: { name: "Fire Energy" } },
      { quantity: 1, card: { name: "Pikachu" } },
    ];

    expect(descreverCartas(itens)).toBe("2× Fire Energy, 1× Pikachu");
  });

  it("avisa quando a lista está vazia", () => {
    expect(descreverCartas([])).toBe("nenhuma carta");
  });
});
