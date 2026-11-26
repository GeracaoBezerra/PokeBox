import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { CONFIG } from "../config";
import { renderWithProviders } from "../test/renderWithProviders";
import { server } from "../test/server";
import { criarSessaoFalsa } from "../test/sessaoFalsa";
import MarketplacePage from "./marketplace";

const url = (caminho) => `${CONFIG.apiBaseUrl}${caminho}`;
const anuncio = {
  id: "a1",
  status: "ACTIVE",
  quantity: 1,
  owner: { username: "misty" },
  card: { id: "base1-2", name: "Blastoise", setName: "Base Set", imageUrl: null },
  item: { finish: "HOLO", condition: "NEAR_MINT" },
};

function resposta(items, { hasNextPage = false, wishlistCardIds } = {}) {
  return HttpResponse.json({ data: { items, wishlistCardIds }, pagination: { hasNextPage } });
}

function servidor(listar) {
  server.use(
    http.get(url("/listings"), ({ request }) => listar(new URL(request.url).searchParams)),
    http.get(url("/cards/filters"), () => HttpResponse.json({ data: { rarities: [] } })),
  );
}

describe("Filtros do marketplace", () => {
  it("mostra a vitrine e avisa quando a busca da URL excede o limite", async () => {
    servidor((params) => {
      expect(params.has("q")).toBe(false);
      return resposta([anuncio]);
    });
    renderWithProviders(<MarketplacePage />, { rota: `/marketplace?q=${"a".repeat(51)}` });

    expect(await screen.findByRole("link", { name: "Blastoise", exact: true })).toBeInTheDocument();
    expect(screen.getByText("A busca aceita até 50 caracteres.")).toBeInTheDocument();
  });

  it("impede pular páginas enquanto ainda usa a paginação anterior", async () => {
    let liberar;
    const espera = new Promise((resolver) => { liberar = resolver; });
    servidor(async (params) => {
      if (params.get("page") === "1") return resposta([anuncio], { hasNextPage: true });
      await espera;
      return resposta([anuncio]);
    });
    renderWithProviders(<MarketplacePage />);

    const proxima = await screen.findByRole("button", { name: "Próxima" });
    await userEvent.click(proxima);
    expect(screen.getByText("Página 2")).toBeInTheDocument();
    expect(proxima).toBeDisabled();
    expect(screen.getByRole("button", { name: "Anterior" })).toBeDisabled();

    liberar();
    expect(await screen.findByText("1 anúncio nesta página")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Anterior" })).toBeEnabled();
    expect(proxima).toBeDisabled();
  });

  it("descarta os resultados da wishlist da sessão anterior ao sair", async () => {
    let liberar;
    const espera = new Promise((resolver) => { liberar = resolver; });
    servidor(async (params) => {
      if (params.get("wishlist") === "true") {
        return resposta([anuncio], { wishlistCardIds: [anuncio.card.id] });
      }
      await espera;
      return resposta([]);
    });
    const service = criarSessaoFalsa();
    renderWithProviders(<MarketplacePage />, { rota: "/marketplace?wishlist=1", service });

    expect(await screen.findByText("Na sua wishlist")).toBeInTheDocument();
    act(() => service.logout());
    expect(screen.queryByRole("link", { name: "Blastoise", exact: true })).not.toBeInTheDocument();
    liberar();
    expect(await screen.findByRole("heading", { name: "Nenhum anúncio encontrado" })).toBeInTheDocument();
  });
});
