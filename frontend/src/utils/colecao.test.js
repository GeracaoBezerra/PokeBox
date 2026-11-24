import { describe, expect, it } from "vitest";
import {
  avisoDeAdicao,
  chaveDoItem,
  filtrosDaApi,
  filtrosDaColecao,
  motivoDeNaoApagar,
  quantidadeValida,
  textoTotais,
} from "./colecao";

describe("utils da coleção", () => {
  it("textoTotais acerta singular e plural", () => {
    expect(textoTotais({ totalUnits: 0, distinctCards: 0, listedItems: 0 })).toBe("0 cartas · 0 diferentes · 0 anunciadas");
    expect(textoTotais({ totalUnits: 1, distinctCards: 1, listedItems: 1 })).toBe("1 carta · 1 diferente · 1 anunciada");
    expect(textoTotais({ totalUnits: 142, distinctCards: 87, listedItems: 12 })).toBe("142 cartas · 87 diferentes · 12 anunciadas");
  });

  it("filtrosDaColecao ignora valores fora da lista e lê a visão", () => {
    const filtros = filtrosDaColecao(new URLSearchParams("type=Nada&condition=MINT&isPublic=talvez&visao=lista&page=-2"));

    expect(filtros).toMatchObject({ type: "", condition: "MINT", isPublic: "", visao: "lista", page: 1, zerados: "" });
    expect(filtrosDaColecao(new URLSearchParams("")).visao).toBe("grade");
  });

  it("filtrosDaApi esconde os zerados até pedir para mostrar", () => {
    expect(filtrosDaApi(filtrosDaColecao(new URLSearchParams("q=pika"))).withZero).toBe("false");
    expect(filtrosDaApi(filtrosDaColecao(new URLSearchParams("zerados=1"))).withZero).toBe("");
  });

  it("motivoDeNaoApagar traduz o deleteBlockedBy da API", () => {
    expect(motivoDeNaoApagar("RESERVED")).toBe("Está numa troca em andamento");
    expect(motivoDeNaoApagar("OPEN_LISTING")).toBe("Tem anúncio aberto");
    expect(motivoDeNaoApagar("OPEN_OFFER")).toBe("Está numa oferta aberta");
    expect(motivoDeNaoApagar("LISTING_HISTORY")).toBeNull();
    expect(motivoDeNaoApagar(null)).toBeNull();
  });

  it("avisoDeAdicao diz se somou e se saiu da wishlist", () => {
    const card = { name: "Charizard" };
    expect(avisoDeAdicao({ item: { quantity: 3, card }, removedFromWishlist: false }, 2)).toBe(
      "Somamos 2 ao Charizard que você já tinha.",
    );
    expect(avisoDeAdicao({ item: { quantity: 1, card }, removedFromWishlist: true }, 1)).toBe(
      "Charizard entrou na sua coleção. Charizard saiu da sua wishlist.",
    );
  });

  it("quantidadeValida exige inteiro a partir de 1", () => {
    expect(quantidadeValida("1")).toBe(true);
    expect(quantidadeValida("0")).toBe(false);
    expect(quantidadeValida("")).toBe(false);
    expect(quantidadeValida("1.5")).toBe(false);
  });

  it("chaveDoItem muda quando os dados do item mudam", () => {
    const item = { id: "a", quantity: 1, reservedQuantity: 0, condition: "MINT", isPublic: true, deleteBlockedBy: null };
    expect(chaveDoItem(item)).not.toBe(chaveDoItem({ ...item, quantity: 2 }));
    expect(chaveDoItem(item)).toBe(chaveDoItem({ ...item }));
  });
});
