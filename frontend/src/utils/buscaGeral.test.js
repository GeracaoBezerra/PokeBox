import { describe, expect, it } from "vitest";
import { contextoDaBusca, destinoDaBusca, ehBuscaDePerfil, termoDaUrl } from "./buscaGeral";

describe("contextoDaBusca", () => {
  it("no marketplace e no detalhe do anúncio, busca anúncios", () => {
    expect(contextoDaBusca("/marketplace")).toMatchObject({ campo: "q", rotulo: "Buscar no marketplace", naPaginaDeResultados: true });
    expect(contextoDaBusca("/marketplace/abc")).toMatchObject({ campo: "q", naPaginaDeResultados: false });
  });

  it("nas outras páginas, busca cartas", () => {
    expect(contextoDaBusca("/catalogo")).toMatchObject({ campo: "name", rotulo: "Buscar cartas", naPaginaDeResultados: true });
    expect(contextoDaBusca("/")).toMatchObject({ campo: "name", naPaginaDeResultados: false });
    expect(contextoDaBusca("/colecao")).toMatchObject({ caminho: "/catalogo", naPaginaDeResultados: false });
  });
});

describe("termoDaUrl", () => {
  it("lê o name no catálogo e o q no marketplace", () => {
    expect(termoDaUrl("/catalogo", "?name=eevee&lang=pt")).toBe("eevee");
    expect(termoDaUrl("/marketplace", "?q=charizard")).toBe("charizard");
  });

  it("fora da página de resultados, o campo fica vazio", () => {
    expect(termoDaUrl("/", "?name=eevee")).toBe("");
    expect(termoDaUrl("/marketplace/abc", "?q=x")).toBe("");
    expect(termoDaUrl("/catalogo", "")).toBe("");
  });
});

describe("ehBuscaDePerfil", () => {
  it("reconhece o @ no começo", () => {
    expect(ehBuscaDePerfil(" @ash")).toBe(true);
    expect(ehBuscaDePerfil("ash")).toBe(false);
  });
});

describe("destinoDaBusca", () => {
  it("da home, leva ao catálogo com o nome", () => {
    expect(destinoDaBusca("/", "", " pikachu ")).toEqual({ url: "/catalogo?name=pikachu" });
  });

  it("no catálogo, mantém idioma, filtros e ordenação e zera a página", () => {
    expect(destinoDaBusca("/catalogo", "?lang=pt&type=Fogo&page=3&sort=name", "charmander")).toEqual({
      url: "/catalogo?lang=pt&type=Fogo&sort=name&name=charmander",
    });
  });

  it("apagar o texto no catálogo tira o name", () => {
    expect(destinoDaBusca("/catalogo", "?name=eevee&lang=en", "")).toEqual({ url: "/catalogo?lang=en" });
    expect(destinoDaBusca("/catalogo", "?name=eevee", "")).toEqual({ url: "/catalogo" });
  });

  it("no marketplace, busca anúncios mantendo os filtros", () => {
    expect(destinoDaBusca("/marketplace", "?condition=NEAR_MINT&page=2", "charizard")).toEqual({
      url: "/marketplace?condition=NEAR_MINT&q=charizard",
    });
  });

  it("no detalhe do anúncio, volta para o marketplace com a busca", () => {
    expect(destinoDaBusca("/marketplace/abc", "", "ultra ball")).toEqual({ url: "/marketplace?q=ultra+ball" });
  });

  it("@usuario abre o perfil", () => {
    expect(destinoDaBusca("/", "", "@ash")).toEqual({ url: "/u/ash" });
    expect(destinoDaBusca("/catalogo", "?name=x", "@Misty")).toEqual({ url: "/u/misty" });
  });

  it("@ com nome inválido devolve o erro", () => {
    expect(destinoDaBusca("/", "", "@a")).toEqual({ erro: "Nome de usuário inválido" });
    expect(destinoDaBusca("/", "", "@")).toEqual({ erro: "Nome de usuário inválido" });
  });
});
