import { screen } from "@testing-library/react";
import { http as rota, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { CONFIG } from "../../config";
import { renderWithProviders } from "../../test/renderWithProviders";
import { server } from "../../test/server";
import GridCartas from "./GridCartas";

const url = (caminho) => `${CONFIG.apiBaseUrl}${caminho}`;
const pagina = (items) => HttpResponse.json({ success: true, data: items, pagination: { page: 1, limit: 8, total: items.length } });

const charizard = { id: "base1-4", name: "Charizard", number: "4", set: { name: "Base" }, image: { small: null }, wishlistCount: 3 };
const pikachu = { id: "sv1-63", name: "Pikachu", number: "63", set: { name: "Escarlate e Violeta" }, image: { small: null }, wishlistCount: 2 };

function servir(respostas) {
  const pedidos = [];
  server.use(
    rota.get(url("/cards"), ({ request }) => {
      const lang = new URL(request.url).searchParams.get("lang");
      pedidos.push(lang);
      return respostas[lang]();
    })
  );
  return pedidos;
}

describe("Mais desejadas da home", () => {
  it("mostra o ranking em inglês quando o português vem vazio", async () => {
    const pedidos = servir({ pt: () => pagina([]), en: () => pagina([charizard]) });

    renderWithProviders(<GridCartas />);

    expect(await screen.findByRole("link", { name: /Charizard/ })).toHaveAttribute("href", "/cards/base1-4?lang=en");
    expect(screen.getByRole("link", { name: /Ver todas/ })).toHaveAttribute("href", "/catalogo?sort=wanted&order=desc&lang=en");
    expect(pedidos).toEqual(["pt", "en"]);
  });

  it("com cartas em português, não busca em inglês", async () => {
    const pedidos = servir({ pt: () => pagina([pikachu]), en: () => pagina([charizard]) });

    renderWithProviders(<GridCartas />);

    expect(await screen.findByRole("link", { name: /Pikachu/ })).toHaveAttribute("href", "/cards/sv1-63?lang=pt");
    expect(screen.getByRole("link", { name: /Ver todas/ })).toHaveAttribute("href", "/catalogo?sort=wanted&order=desc");
    expect(screen.queryByRole("link", { name: /Charizard/ })).not.toBeInTheDocument();
    expect(pedidos).toEqual(["pt"]);
  });

  it("erro no português mostra o aviso e não busca em inglês", async () => {
    const pedidos = servir({
      pt: () => HttpResponse.json({ success: false, error: "Serviço indisponível" }, { status: 503 }),
      en: () => pagina([charizard]),
    });

    renderWithProviders(<GridCartas />);

    expect(await screen.findByRole("button", { name: "Tentar de novo" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Charizard/ })).not.toBeInTheDocument();
    expect(pedidos).toEqual(["pt"]);
  });
});
