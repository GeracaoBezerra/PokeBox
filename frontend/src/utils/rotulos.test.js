import { describe, expect, it } from "vitest";
import {
  STATUS_ANUNCIO,
  confirmacoesDaTroca,
  contarOfertasAguardando,
  descreverCartas,
  esperaMinhaConfirmacao,
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

describe("STATUS_ANUNCIO", () => {
  it("tem o rótulo do anúncio em troca", () => {
    expect(STATUS_ANUNCIO.IN_TRADE).toBe("Em troca");
  });
});

describe("proximoPassoOferta", () => {
  const base = { dono: "ash", proponente: "misty", virouTroca: false };

  it("oferta aguardando resposta", () => {
    expect(proximoPassoOferta({ ...base, status: "PROPOSED", recebida: true })).toBe("Aceite ou recuse esta oferta.");
    expect(proximoPassoOferta({ ...base, status: "PROPOSED", recebida: false })).toBe("Aguardando @ash responder.");
  });

  it("oferta em espera, para o dono, conforme o anúncio", () => {
    expect(proximoPassoOferta({ ...base, status: "PROPOSED", recebida: true, emEspera: true, statusDoAnuncio: "IN_TRADE" })).toBe(
      "Em espera: este anúncio está em troca com outra pessoa."
    );
    expect(proximoPassoOferta({ ...base, status: "PROPOSED", recebida: true, emEspera: true, statusDoAnuncio: "ACTIVE" })).toBe(
      "Em espera: este anúncio não tem quantidade suficiente agora."
    );
    expect(proximoPassoOferta({ ...base, status: "PROPOSED", recebida: true, emEspera: true })).toBe(
      "Em espera: este anúncio está em troca com outra pessoa."
    );
  });

  it("oferta em espera, para quem ofertou", () => {
    expect(proximoPassoOferta({ ...base, status: "PROPOSED", recebida: false, emEspera: true, statusDoAnuncio: "IN_TRADE" })).toBe(
      "Em espera: o anúncio está em negociação; se a troca não acontecer, sua oferta volta a valer."
    );
  });

  it("oferta aceita sem troca (dado antigo)", () => {
    expect(proximoPassoOferta({ ...base, status: "ACCEPTED", recebida: true })).toBe("Aceita.");
  });

  it("oferta que virou troca", () => {
    expect(proximoPassoOferta({ ...base, status: "ACCEPTED", recebida: true, virouTroca: true })).toBe(
      "Virou troca: as cartas estão reservadas. Confirme o recebimento em Trocas."
    );
  });

  it("oferta cuja troca já concluiu ou foi desfeita", () => {
    const troca = { ...base, status: "ACCEPTED", recebida: true, virouTroca: true };
    expect(proximoPassoOferta({ ...troca, statusDaTroca: "PROPOSED" })).toBe(
      "Virou troca: as cartas estão reservadas. Confirme o recebimento em Trocas."
    );
    expect(proximoPassoOferta({ ...troca, statusDaTroca: "ACCEPTED" })).toBe("Troca concluída: as cartas já mudaram de dono.");
    expect(proximoPassoOferta({ ...troca, statusDaTroca: "CANCELED" })).toBe("Troca desfeita: as cartas voltaram para cada um.");
  });

  it("oferta recusada ou cancelada sem motivo", () => {
    expect(proximoPassoOferta({ ...base, status: "REJECTED", recebida: true })).toBe("Encerrada.");
    expect(proximoPassoOferta({ ...base, status: "CANCELED", recebida: false })).toBe("Encerrada.");
  });

  it("oferta cancelada mostra o motivo", () => {
    const cancelada = (cancelReason, recebida) => proximoPassoOferta({ ...base, status: "CANCELED", recebida, cancelReason });
    expect(cancelada("PROPOSER", false)).toBe("Você cancelou a oferta.");
    expect(cancelada("PROPOSER", true)).toBe("@misty cancelou a oferta.");
    expect(cancelada("LISTING_CLOSED", false)).toBe("Cancelada: @ash fechou o anúncio.");
    expect(cancelada("LISTING_CLOSED", true)).toBe("Cancelada: você fechou o anúncio.");
    expect(cancelada("LISTING_BLOCKED", false)).toBe("Cancelada: o anúncio foi bloqueado pela moderação.");
    expect(cancelada("LISTING_TRADED", false)).toBe("Cancelada: o anúncio foi trocado com outra pessoa.");
    expect(cancelada("ACCOUNT_DEACTIVATED", true)).toBe("Cancelada: a conta foi desativada.");
  });
});

describe("proximoPassoTroca", () => {
  it("troca em andamento, ninguém confirmou", () => {
    expect(proximoPassoTroca({ status: "PROPOSED", euConfirmei: false, parceiroConfirmou: false, parceiro: "misty" })).toBe(
      "Confirme quando receber as cartas."
    );
  });

  it("troca em andamento, você confirmou", () => {
    expect(proximoPassoTroca({ status: "PROPOSED", euConfirmei: true, parceiroConfirmou: false, parceiro: "misty" })).toBe(
      "Você confirmou. Aguardando @misty confirmar."
    );
  });

  it("troca em andamento, o outro confirmou", () => {
    expect(proximoPassoTroca({ status: "PROPOSED", euConfirmei: false, parceiroConfirmou: true, parceiro: "ash" })).toBe(
      "@ash já confirmou. Confirme quando receber as cartas."
    );
  });

  it("troca concluída", () => {
    expect(proximoPassoTroca({ status: "ACCEPTED", parceiro: "ash" })).toBe("As cartas já mudaram de dono.");
  });

  it("troca recusada ou cancelada", () => {
    expect(proximoPassoTroca({ status: "REJECTED", parceiro: "misty" })).toBe("As cartas reservadas voltaram a ficar disponíveis.");
    expect(proximoPassoTroca({ status: "CANCELED", parceiro: "ash" })).toBe("As cartas reservadas voltaram a ficar disponíveis.");
  });
});

describe("confirmações da troca", () => {
  const troca = { status: "PROPOSED", proposerConfirmedAt: "2026-11-20T10:00:00Z", recipientConfirmedAt: null };

  it("lê a confirmação de cada lado conforme quem olha", () => {
    expect(confirmacoesDaTroca(troca, true)).toEqual({ euConfirmei: false, parceiroConfirmou: true });
    expect(confirmacoesDaTroca(troca, false)).toEqual({ euConfirmei: true, parceiroConfirmou: false });
  });

  it("só espera a sua confirmação em troca em andamento que você ainda não confirmou", () => {
    expect(esperaMinhaConfirmacao(troca, true)).toBe(true);
    expect(esperaMinhaConfirmacao(troca, false)).toBe(false);
    expect(esperaMinhaConfirmacao({ ...troca, status: "ACCEPTED", recipientConfirmedAt: "x" }, true)).toBe(false);
    expect(esperaMinhaConfirmacao({ ...troca, status: "CANCELED" }, true)).toBe(false);
  });
});
