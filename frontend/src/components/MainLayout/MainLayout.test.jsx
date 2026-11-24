import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import App from "../../App";
import { renderWithProviders } from "../../test/renderWithProviders";
import { criarSessaoFalsa } from "../../test/sessaoFalsa";

describe("MainLayout: pular para o conteúdo", () => {
  it("é o primeiro item do Tab e leva o foco ao conteúdo principal", async () => {
    const usuario = userEvent.setup();
    renderWithProviders(<App />, { rota: "/rota-que-nao-existe", service: criarSessaoFalsa(null) });
    await screen.findByRole("heading", { name: "Página não encontrada." });

    await usuario.tab();
    const pular = screen.getByRole("link", { name: "Pular para o conteúdo" });
    expect(pular).toHaveFocus();
    expect(pular).toHaveAttribute("href", "#conteudo");

    await usuario.keyboard("{Enter}");
    const principal = screen.getByRole("main");
    expect(principal).toHaveAttribute("id", "conteudo");
    expect(principal).toHaveFocus();
  });
});
