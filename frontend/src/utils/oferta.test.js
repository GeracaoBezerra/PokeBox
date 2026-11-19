import { describe, expect, it } from "vitest";
import { filtrarPorNome, normalizar, textoVoceDa, textoVoceRecebe, unirPorId } from "./oferta";

const item = (id, name, extra = {}) => ({ id, card: { name }, finish: "NORMAL", firstEdition: false, condition: "GOOD", ...extra });

describe("normalizar", () => {
  it("tira acento e deixa tudo minúsculo", () => {
    expect(normalizar("Flabébé POKÉMON")).toBe("flabebe pokemon");
  });

  it("aceita valor vazio", () => {
    expect(normalizar(undefined)).toBe("");
  });
});

describe("filtrarPorNome", () => {
  const itens = [item("1", "Fire Energy"), item("2", "Pokémon Center Lady"), item("3", "Charmander")];

  it("sem busca, devolve tudo", () => {
    expect(filtrarPorNome(itens, "  ")).toBe(itens);
  });

  it("acha pelo pedaço do nome, sem diferenciar maiúscula", () => {
    expect(filtrarPorNome(itens, "FIRE").map((i) => i.id)).toEqual(["1"]);
  });

  it("acha nome com acento digitando sem acento", () => {
    expect(filtrarPorNome(itens, "pokemon").map((i) => i.id)).toEqual(["2"]);
  });
});

describe("unirPorId", () => {
  it("junta as listas sem repetir o mesmo item", () => {
    expect(unirPorId([item("1", "A"), item("2", "B")], [item("2", "B"), item("3", "C")]).map((i) => i.id)).toEqual(["1", "2", "3"]);
  });
});

describe("textos do resumo da troca", () => {
  const anuncio = {
    card: { name: "Charizard" },
    item: { finish: "HOLO", firstEdition: false, condition: "NEAR_MINT" },
    owner: { username: "ash" },
  };

  it("descreve o que a pessoa recebe", () => {
    expect(textoVoceRecebe(anuncio, "2")).toBe("Você recebe: 2× Charizard (Holo, Near Mint) de @ash.");
  });

  it("descreve as cartas oferecidas com variante e condição", () => {
    const escolhidas = [
      { item: item("1", "Fire Energy", { condition: "EXCELLENT" }), quantidade: "2" },
      { item: item("2", "Pikachu", { finish: "REVERSE", firstEdition: true }), quantidade: 1 },
    ];
    expect(textoVoceDa(escolhidas)).toBe("Você dá: 2× Fire Energy (Normal, Excellent), 1× Pikachu (Reverse · 1ª edição, Good).");
  });

  it("pede para escolher uma carta quando nada foi marcado", () => {
    expect(textoVoceDa([])).toBe("Você dá: escolha ao menos uma carta acima.");
  });
});
