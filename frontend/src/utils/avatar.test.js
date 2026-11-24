import { describe, expect, it } from "vitest";
import { corDoAvatar, iniciais } from "./avatar";

describe("iniciais", () => {
  it("pega a primeira letra das duas primeiras palavras do nome", () => {
    expect(iniciais("Ash Ketchum")).toBe("AK");
    expect(iniciais("  misty   da   água ")).toBe("MD");
    expect(iniciais("Brock")).toBe("B");
  });

  it("usa o username quando não há nome", () => {
    expect(iniciais("", "gary")).toBe("G");
    expect(iniciais(undefined, "erika")).toBe("E");
  });
});

describe("corDoAvatar", () => {
  it("devolve sempre a mesma cor para o mesmo username", () => {
    expect(corDoAvatar("ash")).toEqual(corDoAvatar("ash"));
    expect(corDoAvatar("misty")).toEqual(corDoAvatar("misty"));
  });

  it("usa um par de tokens de tipo com fundo e texto combinando", () => {
    const { fundo, texto } = corDoAvatar("ash");
    const tipo = fundo.match(/^var\(--tipo-([a-z]+)\)$/)[1];
    expect(texto).toBe(`var(--tipo-${tipo}-texto)`);
  });

  it("espalha usernames diferentes por cores diferentes", () => {
    const cores = new Set(["ash", "misty", "brock", "gary", "erika", "dawn", "cynthia", "admin"].map((u) => corDoAvatar(u).fundo));
    expect(cores.size).toBeGreaterThan(3);
  });
});
