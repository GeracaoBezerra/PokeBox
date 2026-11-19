import { describe, expect, it } from "vitest";
import {
  contarOfertasAguardando,
  descreverCartas,
  formatarData,
  precoReferencia,
  proximoPassoOferta,
  proximoPassoTroca,
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

describe("proximoPassoOferta", () => {
  const base = { dono: "ash", proponente: "misty", virouTroca: false };

  it("oferta aguardando resposta", () => {
    expect(proximoPassoOferta({ ...base, status: "PROPOSED", recebida: true })).toBe("Aceite ou recuse esta oferta.");
    expect(proximoPassoOferta({ ...base, status: "PROPOSED", recebida: false })).toBe("Aguardando @ash responder.");
  });

  it("oferta aceita ainda sem troca", () => {
    expect(proximoPassoOferta({ ...base, status: "ACCEPTED", recebida: true })).toBe("Aguardando @misty criar a troca.");
    expect(proximoPassoOferta({ ...base, status: "ACCEPTED", recebida: false })).toBe(
      "Aceita. Agora crie a troca para reservar as cartas."
    );
  });

  it("oferta que virou troca", () => {
    expect(proximoPassoOferta({ ...base, status: "ACCEPTED", recebida: true, virouTroca: true })).toBe("Acompanhe em Trocas.");
  });

  it("oferta recusada ou cancelada", () => {
    expect(proximoPassoOferta({ ...base, status: "REJECTED", recebida: true })).toBe("Encerrada.");
    expect(proximoPassoOferta({ ...base, status: "CANCELED", recebida: false })).toBe("Encerrada.");
  });
});

describe("proximoPassoTroca", () => {
  it("troca em andamento", () => {
    expect(proximoPassoTroca({ status: "PROPOSED", souDonoDoAnuncio: true, parceiro: "misty" })).toBe(
      "Confira as cartas e conclua ou recuse."
    );
    expect(proximoPassoTroca({ status: "PROPOSED", souDonoDoAnuncio: false, parceiro: "ash" })).toBe("Aguardando @ash concluir.");
  });

  it("troca concluída", () => {
    expect(proximoPassoTroca({ status: "ACCEPTED", souDonoDoAnuncio: false, parceiro: "ash" })).toBe("As cartas já mudaram de dono.");
  });

  it("troca recusada ou cancelada", () => {
    expect(proximoPassoTroca({ status: "REJECTED", souDonoDoAnuncio: true, parceiro: "misty" })).toBe(
      "As cartas reservadas voltaram a ficar disponíveis."
    );
    expect(proximoPassoTroca({ status: "CANCELED", souDonoDoAnuncio: false, parceiro: "ash" })).toBe(
      "As cartas reservadas voltaram a ficar disponíveis."
    );
  });
});
