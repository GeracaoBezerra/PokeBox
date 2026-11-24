import { describe, expect, it } from "vitest";
import { abaDaUrl, chaveDoAnuncio, contagemPorAba, livresParaAnunciar, mudancasDoAnuncio } from "./anuncios";

const anuncio = (status, quantity = 1, itemId = "i1") => ({ id: status, status, quantity, item: { id: itemId } });

describe("utils de Meus anúncios", () => {
  it("aba desconhecida ou ausente vira Ativos", () => {
    expect(abaDaUrl(null)).toBe("ativos");
    expect(abaDaUrl("outra")).toBe("ativos");
    expect(abaDaUrl("encerrados")).toBe("encerrados");
  });

  it("conta em troca como ativo e bloqueado como encerrado", () => {
    const lista = ["ACTIVE", "IN_TRADE", "PAUSED", "CLOSED", "BLOCKED"].map((status) => anuncio(status));
    expect(contagemPorAba(lista)).toEqual({ ativos: 2, pausados: 1, encerrados: 2 });
  });

  it("a chave muda quando a quantidade, o status ou a descrição mudam", () => {
    const base = { id: "a1", status: "ACTIVE", quantity: 2, description: null, updatedAt: "x" };
    expect(chaveDoAnuncio(base)).not.toBe(chaveDoAnuncio({ ...base, quantity: 1 }));
    expect(chaveDoAnuncio(base)).not.toBe(chaveDoAnuncio({ ...base, status: "PAUSED" }));
    expect(chaveDoAnuncio(base)).not.toBe(chaveDoAnuncio({ ...base, description: "nova" }));
  });

  it("desconta dos itens o que já está em anúncios abertos, ignorando os encerrados", () => {
    const itens = [
      { id: "i1", available: 3 },
      { id: "i2", available: 1 },
      { id: "i3", available: 2 },
    ];
    const anuncios = [anuncio("ACTIVE", 1, "i1"), anuncio("PAUSED", 1, "i2"), anuncio("CLOSED", 2, "i3")];
    expect(livresParaAnunciar(itens, anuncios)).toEqual([
      { id: "i1", available: 3, livre: 2 },
      { id: "i3", available: 2, livre: 2 },
    ]);
  });

  it("só manda o que mudou, com a descrição sem espaços nas pontas", () => {
    const atual = { quantity: 2, description: null };
    expect(mudancasDoAnuncio(atual, { quantity: "2", description: "  " })).toEqual({});
    expect(mudancasDoAnuncio(atual, { quantity: "3", description: " oi " })).toEqual({ quantity: 3, description: "oi" });
  });
});
