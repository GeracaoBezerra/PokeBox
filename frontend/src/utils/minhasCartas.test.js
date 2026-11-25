import { describe, expect, it } from "vitest";
import { indexarMinhasCartas, juntarMinhasCartas } from "./minhasCartas";

describe("indexarMinhasCartas", () => {
  it("liga cada carta da wishlist ao id do item e junta as cartas da coleção", () => {
    const { naWishlist, tenho } = indexarMinhasCartas(
      [{ id: "w1", cardId: "base1-4" }],
      [{ id: "c1", cardId: "sv02-279" }, { id: "c2", cardId: "sv02-279" }]
    );
    expect(naWishlist.get("base1-4")).toBe("w1");
    expect(naWishlist.has("sv02-279")).toBe(false);
    expect(tenho.has("sv02-279")).toBe(true);
    expect(tenho.size).toBe(1);
  });

  it("comUnidade só tem as cartas com unidade na coleção, como a regra do backend", () => {
    const { tenho, comUnidade } = indexarMinhasCartas(
      [],
      [{ cardId: "base1-4", quantity: 0 }, { cardId: "base1-2", quantity: 0 }, { cardId: "base1-2", quantity: 1 }]
    );
    expect(tenho.has("base1-4")).toBe(true);
    expect(comUnidade.has("base1-4")).toBe(false);
    expect(comUnidade.has("base1-2")).toBe(true);
  });

  it("guarda todas as versões de cada carta", () => {
    const resultado = indexarMinhasCartas([], [
      { id: "c1", cardId: "base1-4", finish: "NORMAL" },
      { id: "c2", cardId: "base1-4", finish: "HOLO" },
    ]);
    expect(resultado.versoes.get("base1-4").map((item) => item.id)).toEqual(["c1", "c2"]);
  });

  it("sem listas (sem login), nada está marcado", () => {
    const { naWishlist, tenho } = indexarMinhasCartas();
    expect(naWishlist.size).toBe(0);
    expect(tenho.size).toBe(0);
  });
});

describe("juntarMinhasCartas", () => {
  const ok = (value) => ({ status: "fulfilled", value });
  const falhou = (reason) => ({ status: "rejected", reason });
  const erro = { status: 503 };

  it("com as duas consultas certas, guarda as duas listas e não tem erro", () => {
    expect(juntarMinhasCartas(null, [ok(["w"]), ok(["c"])])).toEqual({ wishlist: ["w"], colecao: ["c"], erro: null });
  });

  it("se uma falha na primeira vez, guarda a que deu certo e deixa a outra desconhecida", () => {
    expect(juntarMinhasCartas(null, [falhou(erro), ok(["c"])])).toEqual({ wishlist: null, colecao: ["c"], erro });
  });

  it("se uma falha depois, mantém o último estado conhecido dela e atualiza a outra", () => {
    const anterior = { wishlist: ["w-antiga"], colecao: ["c-antiga"] };
    expect(juntarMinhasCartas(anterior, [falhou(erro), ok(["c-nova"])])).toEqual({ wishlist: ["w-antiga"], colecao: ["c-nova"], erro });
  });
});
