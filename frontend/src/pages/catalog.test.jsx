import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http as rota, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { CONFIG } from "../config";
import { renderWithProviders } from "../test/renderWithProviders";
import { criarSessaoFalsa } from "../test/sessaoFalsa";
import { server } from "../test/server";
import CatalogPage from "./catalog";

const url = (caminho) => `${CONFIG.apiBaseUrl}${caminho}`;

const charizard = { id: "base1-4", name: "Charizard", number: "4", image: null, set: { id: "base1", name: "Base Set" } };

const opcoes = {
  types: ["Fire", "Water"],
  rarities: ["Rare"],
  categories: ["Pokemon"],
  sets: [{ id: "base1", name: "Base Set" }],
};

function apiDoCatalogo(responder) {
  const pedidos = [];
  server.use(
    rota.get(url("/cards/filters"), () => HttpResponse.json({ success: true, data: opcoes })),
    rota.get(url("/cards"), ({ request }) => {
      const params = new URL(request.url).searchParams;
      pedidos.push(params);
      return HttpResponse.json({ success: true, ...responder(params) });
    })
  );
  return pedidos;
}

function renderizar(endereco) {
  return renderWithProviders(<CatalogPage />, { rota: endereco, service: criarSessaoFalsa(null) });
}

const pagina = (items, hasNextPage = false) => ({ data: items, pagination: { page: 1, limit: 24, hasNextPage } });

describe("Catálogo: mensagens da busca", () => {
  it("avisa as palavras ignoradas e para quais nome e sets mostrou resultados", async () => {
    apiDoCatalogo(() => ({
      ...pagina([charizard]),
      search: { name: "charizard", sets: ["Base Set", "Base Set 2"], ignored: ["pipi"] },
    }));

    renderizar("/catalogo?name=charizard%20base%20pipi");

    const aviso = await screen.findByText(/Não achamos tudo que você digitou \(pipi\)/);
    expect(aviso).toHaveTextContent("Não achamos tudo que você digitou (pipi). Mostrando resultados para “charizard” em Base Set, Base Set 2.");
    expect(aviso.closest('[role="status"]')).not.toBeNull();
    expect(screen.getByText(/Resultados para/)).toHaveTextContent("Resultados para “charizard base pipi”");
  });

  it("o aviso some quando a nova busca não ignora nada", async () => {
    apiDoCatalogo((params) => ({
      ...pagina([charizard]),
      search:
        params.get("lang") === "en"
          ? { name: "charizard", sets: ["Base Set"], ignored: [] }
          : { name: "charizard", sets: ["Base Set"], ignored: ["pipi"] },
    }));

    renderizar("/catalogo?name=charizard%20base%20pipi");
    await screen.findByText(/Não achamos tudo que você digitou/);

    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Idioma" }), "en");

    expect(await screen.findByText(/Resultados para/)).toHaveTextContent("Resultados para “charizard” em Base Set");
    expect(screen.queryByText(/Não achamos tudo que você digitou/)).not.toBeInTheDocument();
  });

  it("palavra ignorada com lista vazia não mostra o aviso: quem fala é o estado sem resultado", async () => {
    apiDoCatalogo(() => ({ ...pagina([]), search: { name: null, sets: [], ignored: ["charizard"] } }));

    renderizar("/catalogo?name=charizard&type=Water");

    expect(await screen.findByRole("heading", { name: "Nenhuma carta encontrada para “charizard”" })).toBeInTheDocument();
    expect(screen.queryByText(/Não achamos tudo que você digitou/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Limpar busca" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Limpar filtros" })).toBeInTheDocument();
  });

  it("só o nome do set vira Cartas de ...", async () => {
    apiDoCatalogo(() => ({ ...pagina([charizard]), search: { name: null, sets: ["Base Set", "Base Set 2"], ignored: [] } }));

    renderizar("/catalogo?name=base");

    expect(await screen.findByText("Cartas de Base Set, Base Set 2")).toBeInTheDocument();
  });

  it("sem resultado: mostra o termo, Limpar busca volta para Todas as cartas e não mostra a paginação", async () => {
    const pedidos = apiDoCatalogo((params) =>
      params.get("name") ? { ...pagina([]), search: { name: null, sets: [], ignored: ["pipipopo"] } } : pagina([charizard])
    );

    renderizar("/catalogo?name=pipipopo");

    expect(await screen.findByRole("heading", { name: "Nenhuma carta encontrada para “pipipopo”" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Anterior" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Próxima" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Limpar filtros" })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Limpar busca" }));

    expect(await screen.findByText("Todas as cartas")).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "Próxima" })).toBeInTheDocument();
    expect(pedidos.at(-1).get("name")).toBeNull();
  });

  it("página vazia além da primeira oferece Voltar para a primeira página", async () => {
    const pedidos = apiDoCatalogo((params) => (params.get("page") === "999" ? pagina([]) : pagina([charizard])));

    renderizar("/catalogo?name=pikachu&page=999");

    await userEvent.click(await screen.findByRole("button", { name: "Voltar para a primeira página" }));

    expect(await screen.findByRole("button", { name: "Próxima" })).toBeInTheDocument();
    expect(pedidos.at(-1).get("page")).toBe("1");
    expect(pedidos.at(-1).get("name")).toBe("pikachu");
  });
});
