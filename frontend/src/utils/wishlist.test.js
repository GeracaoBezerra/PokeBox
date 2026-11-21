import { describe, expect, it } from "vitest";
import { filtrosDaWishlist, rotuloDoSeloWishlist, textoColecionadores } from "./wishlist";

const ler = (busca) => filtrosDaWishlist(new URLSearchParams(busca));

describe("filtrosDaWishlist", () => {
  it("sem nada na URL, página 1, ordem por nome e sem filtros", () => {
    expect(ler("")).toEqual({
      q: "",
      type: "",
      rarity: "",
      sort: "",
      page: 1,
      buscaCurta: false,
      buscaLonga: false,
      qApi: "",
    });
  });

  it("lê busca, tipo, raridade, ordem e página válidos", () => {
    expect(ler("q=char&type=Fire&rarity=Rare&sort=recent&page=2")).toMatchObject({
      q: "char",
      type: "Fire",
      rarity: "Rare",
      sort: "recent",
      page: 2,
      qApi: "char",
    });
  });

  it("ignora tipo, ordem e página inválidos", () => {
    expect(ler("type=Fogo&sort=price&page=-3")).toMatchObject({ type: "", sort: "", page: 1 });
    expect(ler("page=1.5").page).toBe(1);
    expect(ler("sort=name").sort).toBe("");
  });

  it("busca curta ou longa demais fica na URL mas não vai para a API", () => {
    expect(ler("q=a")).toMatchObject({ q: "a", buscaCurta: true, qApi: "" });
    const longa = "x".repeat(51);
    expect(ler(`q=${longa}`)).toMatchObject({ buscaLonga: true, qApi: "" });
  });

  it("raridade maior que o limite da API é ignorada", () => {
    expect(ler(`rarity=${"r".repeat(51)}`).rarity).toBe("");
  });
});

describe("textoColecionadores", () => {
  it.each([
    [0, "Ninguém tem ainda"],
    [undefined, "Ninguém tem ainda"],
    [1, "1 colecionador tem esta carta"],
    [3, "3 colecionadores têm esta carta"],
  ])("%s → %s", (quantidade, texto) => {
    expect(textoColecionadores(quantidade)).toBe(texto);
  });
});

describe("rotuloDoSeloWishlist", () => {
  it("mostra o tipo em português e os outros campos com o nome", () => {
    expect(rotuloDoSeloWishlist("type", "Fire")).toBe("Tipo: Fogo");
    expect(rotuloDoSeloWishlist("rarity", "Rare")).toBe("Raridade: Rare");
    expect(rotuloDoSeloWishlist("q", "char")).toBe("Nome: char");
  });
});
