import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import App from "./App";
import { renderWithProviders } from "./test/renderWithProviders";
import { criarSessaoFalsa } from "./test/sessaoFalsa";

describe("App: telas sob demanda", () => {
  it("enquanto o código da tela chega mostra o carregando da página, depois a tela", async () => {
    renderWithProviders(<App />, { rota: "/rota-que-nao-existe", service: criarSessaoFalsa(null) });

    expect(screen.getByRole("status", { name: "Carregando página" })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Página não encontrada." })).toBeInTheDocument();
    expect(screen.queryByRole("status", { name: "Carregando página" })).not.toBeInTheDocument();
  });

  it("o login, fora do layout, também tem o carregando enquanto a tela chega", async () => {
    vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
    renderWithProviders(<App />, { rota: "/login", service: criarSessaoFalsa(null) });

    expect(screen.getByRole("status", { name: "Carregando página" })).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "Entrar" })).toBeInTheDocument();
  });
});
