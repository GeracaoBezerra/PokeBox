import { screen, within } from "@testing-library/react";
import { http as rota, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { CONFIG } from "../../config";
import { renderWithProviders } from "../../test/renderWithProviders";
import { criarSessaoFalsa } from "../../test/sessaoFalsa";
import { server } from "../../test/server";
import Header from "./header";

const url = (caminho) => `${CONFIG.apiBaseUrl}${caminho}`;

function apiDasPendencias() {
  const pedidos = [];
  server.use(
    rota.get(url("/offers/me"), () => {
      pedidos.push("offers");
      return HttpResponse.json({ success: true, data: { sent: [], received: [{ id: "o1", onHold: false }] } });
    }),
    rota.get(url("/trades/me"), () => {
      pedidos.push("trades");
      return HttpResponse.json({ success: true, data: { sent: [], received: [] } });
    })
  );
  return pedidos;
}

const navegacao = () => screen.getByRole("navigation", { name: "Navegação principal" });

describe("Header", () => {
  it("sem sessão mostra todos os links, sem selos, e não busca pendências", async () => {
    const pedidos = apiDasPendencias();
    renderWithProviders(<Header />, { service: criarSessaoFalsa(null) });

    const nav = navegacao();
    expect(within(nav).getByRole("group", { name: "Explorar" })).toBeInTheDocument();
    expect(within(nav).getByRole("group", { name: "Minha área" })).toBeInTheDocument();
    expect(within(nav).getAllByRole("link").map((link) => link.textContent)).toEqual([
      "Home",
      "Cartas",
      "Marketplace",
      "Coleção",
      "Wishlist",
      "Anúncios",
      "Propostas",
      "Trocas",
    ]);
    expect(within(nav).getByRole("link", { name: "Propostas" })).toHaveAttribute("href", "/propostas");
    expect(screen.getByRole("link", { name: "Entrar" })).toBeInTheDocument();

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(pedidos).toEqual([]);
  });

  it("com sessão mostra os dois grupos e o selo de propostas", async () => {
    apiDasPendencias();
    renderWithProviders(<Header />);

    const minhaArea = within(navegacao()).getByRole("group", { name: "Minha área" });
    expect(within(minhaArea).getAllByRole("link").map((link) => link.textContent.replace(/\d+$/, ""))).toEqual([
      "Coleção",
      "Wishlist",
      "Anúncios",
      "Propostas",
      "Trocas",
    ]);
    expect(await within(minhaArea).findByRole("link", { name: "Propostas, 1 aguardando resposta" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Menu da conta de Ash Ketchum" })).toBeInTheDocument();
  });

  it("marca o link da página atual com aria-current, e a Home só na raiz", () => {
    apiDasPendencias();
    renderWithProviders(<Header />, { rota: "/marketplace?page=2" });

    const nav = navegacao();
    expect(within(nav).getByRole("link", { name: "Marketplace" })).toHaveAttribute("aria-current", "page");
    expect(within(nav).getByRole("link", { name: "Home" })).not.toHaveAttribute("aria-current");
    expect(within(nav).getByRole("link", { name: "Cartas" })).not.toHaveAttribute("aria-current");
  });

  it("marca a Home na raiz", () => {
    apiDasPendencias();
    renderWithProviders(<Header />, { service: criarSessaoFalsa(null) });

    expect(within(navegacao()).getByRole("link", { name: "Home" })).toHaveAttribute("aria-current", "page");
  });

  it("marca Propostas mesmo quando o link leva filtros na URL", async () => {
    apiDasPendencias();
    renderWithProviders(<Header />, { rota: "/propostas" });

    const propostas = await within(navegacao()).findByRole("link", { name: "Propostas, 1 aguardando resposta" });
    expect(propostas).toHaveAttribute("aria-current", "page");
  });
});
