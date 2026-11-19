import { describe, expect, it } from "vitest";
import { lerFiltrosNegociacao, mudarFiltros } from "./negociacao";
import { STATUS_NEGOCIACAO } from "./rotulos";

const ler = (busca) => lerFiltrosNegociacao(new URLSearchParams(busca), STATUS_NEGOCIACAO);

describe("lerFiltrosNegociacao", () => {
  it("sem nada na URL, abre Recebidas, todos os status e a página 1", () => {
    expect(ler("")).toEqual({ aba: "recebidas", side: "received", status: "", page: 1 });
  });

  it("lê aba, status e página válidos e converte a aba para o lado da API", () => {
    expect(ler("aba=enviadas&status=ACCEPTED&page=3")).toEqual({ aba: "enviadas", side: "sent", status: "ACCEPTED", page: 3 });
  });

  it("valor inválido cai no padrão", () => {
    expect(ler("aba=xyz&status=FOO&page=-3")).toEqual({ aba: "recebidas", side: "received", status: "", page: 1 });
    expect(ler("page=1.5")).toMatchObject({ page: 1 });
    expect(ler("page=abc")).toMatchObject({ page: 1 });
    expect(ler("aba=received")).toMatchObject({ aba: "recebidas" });
  });

  it("não aceita status que não é da lista da página", () => {
    expect(ler("status=toString")).toMatchObject({ status: "" });
  });
});

describe("mudarFiltros", () => {
  it("troca um filtro e volta para a página 1", () => {
    const novos = mudarFiltros(new URLSearchParams("aba=enviadas&page=2"), { status: "PROPOSED" });
    expect(novos.toString()).toBe("aba=enviadas&status=PROPOSED");
  });

  it("valor vazio tira o filtro da URL", () => {
    const novos = mudarFiltros(new URLSearchParams("aba=enviadas&status=ACCEPTED"), { status: "" });
    expect(novos.toString()).toBe("aba=enviadas");
  });

  it("muda a página sem apagar os filtros", () => {
    const novos = mudarFiltros(new URLSearchParams("aba=enviadas"), { page: 2 }, false);
    expect(novos.toString()).toBe("aba=enviadas&page=2");
  });

  it("voltar para a página 1 tira o page da URL", () => {
    const novos = mudarFiltros(new URLSearchParams("aba=enviadas&page=2"), { page: 1 }, false);
    expect(novos.toString()).toBe("aba=enviadas");
  });

  it("não altera os parâmetros recebidos", () => {
    const atuais = new URLSearchParams("page=2");
    mudarFiltros(atuais, { aba: "enviadas" });
    expect(atuais.toString()).toBe("page=2");
  });
});
