import { describe, expect, it } from "vitest";
import { indexarMinhasCartas } from "./minhasCartas";

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

  it("sem listas (sem login), nada está marcado", () => {
    const { naWishlist, tenho } = indexarMinhasCartas();
    expect(naWishlist.size).toBe(0);
    expect(tenho.size).toBe(0);
  });
});
