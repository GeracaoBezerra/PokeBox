import { describe, expect, it } from "vitest";
import { anuncioPorItem, filtrosDoPerfil, textoAnunciosAtivos, tipoDeErroDoPerfil } from "./perfilPublico";

const ler = (texto) => filtrosDoPerfil(new URLSearchParams(texto));

describe("filtrosDoPerfil", () => {
  it("lê busca, tipo e página da URL", () => {
    expect(ler("q=pikachu&type=Lightning&page=2")).toEqual({ q: "pikachu", type: "Lightning", page: 2, buscaCurta: false, buscaLonga: false, qApi: "pikachu" });
  });

  it("valores inválidos caem no padrão", () => {
    expect(ler("type=xyz&page=-1")).toMatchObject({ type: "", page: 1 });
    expect(ler("page=1.5")).toMatchObject({ page: 1 });
    expect(ler("")).toEqual({ q: "", type: "", page: 1, buscaCurta: false, buscaLonga: false, qApi: "" });
  });

  it("busca sem palavra de 2 letras não vai para a API", () => {
    expect(ler("q=a")).toMatchObject({ q: "a", buscaCurta: true, qApi: "" });
  });
});

describe("busca longa demais", () => {
  it("mais de 50 caracteres não vai para a API", () => {
    expect(ler(`q=${"a".repeat(51)}`)).toMatchObject({ buscaLonga: true, qApi: "" });
  });

  it("50 caracteres ainda valem", () => {
    expect(ler(`q=${"a".repeat(50)}`)).toMatchObject({ buscaLonga: false, qApi: "a".repeat(50) });
  });
});

describe("tipoDeErroDoPerfil", () => {
  it("username inválido na URL é colecionador não encontrado, sem esperar a API", () => {
    expect(tipoDeErroDoPerfil("AB", null)).toBe("naoEncontrado");
  });

  it("404 e 400 do username são colecionador não encontrado", () => {
    expect(tipoDeErroDoPerfil("ash", { status: 404 })).toBe("naoEncontrado");
    expect(tipoDeErroDoPerfil("ash", { status: 400, details: [{ field: "username", message: "x" }] })).toBe("naoEncontrado");
  });

  it("400 de outro campo é filtro inválido, não perfil inexistente", () => {
    expect(tipoDeErroDoPerfil("ash", { status: 400, details: [{ field: "q", message: "q deve ter no máximo 50 caracteres" }] })).toBe("filtro");
  });

  it("sem erro não há nada a mostrar, e erro do servidor segue o aviso de sempre", () => {
    expect(tipoDeErroDoPerfil("ash", null)).toBeNull();
    expect(tipoDeErroDoPerfil("ash", { status: 503 })).toBe("outro");
  });
});

describe("anuncioPorItem", () => {
  it("liga o id do item da coleção ao anúncio", () => {
    const mapa = anuncioPorItem([{ id: "anuncio-1", item: { id: "item-1" } }]);
    expect(mapa.get("item-1").id).toBe("anuncio-1");
    expect(mapa.has("item-2")).toBe(false);
  });

  it("sem anúncios, o mapa fica vazio", () => {
    expect(anuncioPorItem().size).toBe(0);
  });
});

describe("textoAnunciosAtivos", () => {
  it("conta os anúncios no singular e no plural", () => {
    expect(textoAnunciosAtivos(1)).toBe("1 anúncio ativo");
    expect(textoAnunciosAtivos(3)).toBe("3 anúncios ativos");
  });

  it("sem anúncio não mostra nada, e com mais páginas mostra 100+", () => {
    expect(textoAnunciosAtivos(0)).toBeNull();
    expect(textoAnunciosAtivos(100, true)).toBe("100+ anúncios ativos");
  });
});
