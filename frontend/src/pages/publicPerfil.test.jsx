import { render, screen } from "@testing-library/react";
import { http as rota, HttpResponse } from "msw";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { CONFIG } from "../config";
import { server } from "../test/server";
import PublicPerfilPage from "./publicPerfil";

const url = (caminho) => `${CONFIG.apiBaseUrl}${caminho}`;
const ash = { username: "ash", name: "Ash Ketchum", createdAt: "2026-01-01T00:00:00.000Z" };

function apiDoPerfil(responderColecao) {
  server.use(
    rota.get(url("/users/:username/collection"), responderColecao),
    rota.get(url("/listings"), () => HttpResponse.json({ success: true, data: { items: [] }, pagination: { hasNextPage: false } }))
  );
}

function renderizar(endereco) {
  return render(
    <MemoryRouter initialEntries={[endereco]}>
      <Routes>
        <Route path="/u/:username" element={<PublicPerfilPage />} />
      </Routes>
    </MemoryRouter>
  );
}

const colecaoVazia = () => HttpResponse.json({ success: true, data: { user: ash, items: [] }, pagination: { hasNextPage: false } });

describe("PublicPerfilPage", () => {
  it("busca longa demais na URL não esconde o perfil: mostra o perfil, o campo e o aviso", async () => {
    const pedidos = [];
    apiDoPerfil(({ request }) => {
      pedidos.push(new URL(request.url).searchParams.get("q"));
      return colecaoVazia();
    });

    renderizar(`/u/ash?q=${"a".repeat(51)}`);

    expect(await screen.findByRole("heading", { name: "Ash Ketchum" })).toBeInTheDocument();
    expect(screen.getByText(/A busca aceita até 50 caracteres/)).toBeInTheDocument();
    expect(screen.queryByText("Colecionador não encontrado")).not.toBeInTheDocument();
    expect(pedidos).toEqual([null]);
  });

  it("400 de filtro não vira Colecionador não encontrado e o campo de busca continua disponível", async () => {
    apiDoPerfil(() =>
      HttpResponse.json({ success: false, error: "Dados inválidos", details: [{ field: "q", message: "q inválido" }] }, { status: 400 })
    );

    renderizar("/u/ash?q=pikachu");

    expect(await screen.findByRole("heading", { name: "Filtro inválido" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Limpar filtros" })).toBeInTheDocument();
    expect(screen.getByRole("searchbox")).toHaveValue("pikachu");
    expect(screen.queryByText("Colecionador não encontrado")).not.toBeInTheDocument();
  });

  it("404 é Colecionador não encontrado", async () => {
    apiDoPerfil(() => HttpResponse.json({ success: false, error: "Usuário não encontrado" }, { status: 404 }));

    renderizar("/u/misty_nao_existe");

    expect(await screen.findByRole("heading", { name: "Colecionador não encontrado" })).toBeInTheDocument();
  });

  it("username inválido na URL é Colecionador não encontrado", async () => {
    apiDoPerfil(() =>
      HttpResponse.json({ success: false, error: "Dados inválidos", details: [{ field: "username", message: "username inválido" }] }, { status: 400 })
    );

    renderizar("/u/AB");

    expect(await screen.findByRole("heading", { name: "Colecionador não encontrado" })).toBeInTheDocument();
  });
});
