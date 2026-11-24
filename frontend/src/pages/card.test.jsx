import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http as rota, HttpResponse } from "msw";
import { Route, Routes, useLocation } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { CONFIG } from "../config";
import { renderWithProviders } from "../test/renderWithProviders";
import { criarSessaoFalsa } from "../test/sessaoFalsa";
import { server } from "../test/server";
import CardPage from "./card";

const url = (caminho) => `${CONFIG.apiBaseUrl}${caminho}`;

const carta = {
  id: "base1-4",
  name: "Charizard",
  number: "4",
  category: "Pokemon",
  image: null,
  set: { id: "base1", name: "Base Set" },
};

function Destino() {
  const location = useLocation();
  return <p>Em {location.pathname} vindo de {location.state?.de}</p>;
}

function renderizar(endereco = "/cards/base1-4?lang=pt") {
  return renderWithProviders(
    <Routes>
      <Route path="/cards/:id" element={<CardPage />} />
      <Route path="/login" element={<Destino />} />
      <Route path="/register" element={<Destino />} />
    </Routes>,
    { rota: endereco, service: criarSessaoFalsa(null) }
  );
}

describe("Detalhe da carta", () => {
  it("carta que não existe mostra a página 404 com Carta não encontrada", async () => {
    server.use(
      rota.get(url("/cards/nao-existe"), () =>
        HttpResponse.json({ success: false, error: "Carta nao-existe não encontrada" }, { status: 404 })
      )
    );

    renderizar("/cards/nao-existe");

    expect(await screen.findByRole("heading", { name: "Carta não encontrada." })).toBeInTheDocument();
    expect(screen.getByLabelText("Erro 404")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ir para a página inicial" })).toHaveAttribute("href", "/");
  });

  it("outro erro continua com o aviso e o Tentar de novo", async () => {
    server.use(rota.get(url("/cards/base1-4"), () => HttpResponse.json({ success: false, error: "Erro" }, { status: 500 })));

    renderizar();

    expect(await screen.findByRole("heading", { name: "Não foi possível carregar a carta" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tentar de novo" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Carta não encontrada." })).not.toBeInTheDocument();
  });

  it.each([
    ["Entrar na minha conta", "/login"],
    ["Criar uma conta", "/register"],
  ])("deslogado, %s leva junto a página da carta para voltar depois", async (rotulo, caminho) => {
    server.use(
      rota.get(url("/cards/base1-4"), () => HttpResponse.json({ success: true, data: { card: carta, listings: [] } }))
    );

    renderizar();
    await userEvent.click(await screen.findByRole("link", { name: rotulo }));

    expect(screen.getByText(`Em ${caminho} vindo de /cards/base1-4?lang=pt`)).toBeInTheDocument();
  });
});
