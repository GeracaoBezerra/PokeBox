import { describe, expect, it } from "vitest";
import { parametrosDaPagina, semVazios } from "./parametros";

describe("semVazios", () => {
  it("tira texto vazio, null e undefined", () => {
    expect(semVazios({ q: "", type: null, rarity: undefined, sort: "name" })).toEqual({ sort: "name" });
  });

  it("mantém zero e false", () => {
    expect(semVazios({ page: 0, isPublic: false })).toEqual({ page: 0, isPublic: false });
  });
});

describe("parametrosDaPagina", () => {
  it("sem nada, pede a página 1 com 20 itens", () => {
    expect(parametrosDaPagina()).toEqual({ page: 1, limit: 20 });
    expect(parametrosDaPagina({})).toEqual({ page: 1, limit: 20 });
  });

  it("junta os filtros preenchidos com a página e o limite", () => {
    expect(parametrosDaPagina({ q: "pika", type: "", page: 2, limit: 5 })).toEqual({ q: "pika", page: 2, limit: 5 });
  });

  it("usa o padrão quando página e limite vêm undefined", () => {
    expect(parametrosDaPagina({ side: "sent", status: undefined, page: undefined, limit: undefined })).toEqual({
      side: "sent",
      page: 1,
      limit: 20,
    });
  });
});
