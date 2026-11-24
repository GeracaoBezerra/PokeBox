import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { renderWithProviders } from "../test/renderWithProviders";
import SobrePage from "./sobre";

const REPOSITORIO = "https://github.com/GeracaoBezerra/PokeBox";

describe("Página Sobre", () => {
  it("abre na aba A ferramenta, com a troca em 3 passos e o link do repositório", () => {
    renderWithProviders(<SobrePage />, { rota: "/sobre" });

    expect(screen.getByRole("heading", { level: 1, name: "Sobre o PokeBox" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "A ferramenta" })).toHaveAttribute("aria-selected", "true");
    const painel = screen.getByRole("tabpanel");
    expect(within(painel).getByRole("heading", { name: "Como funciona a troca" })).toBeInTheDocument();
    expect(within(painel).getAllByRole("listitem").length).toBeGreaterThan(3);
    expect(within(painel).getByRole("link", { name: "Coleção" })).toHaveAttribute("href", "/colecao");
    expect(within(painel).getByRole("link", { name: "repositório do GitHub" })).toHaveAttribute("href", REPOSITORIO);
  });

  it("mostra a documentação da entrega na aba Como foi feito", async () => {
    renderWithProviders(<SobrePage />, { rota: "/sobre" });

    await userEvent.click(screen.getByRole("tab", { name: "Como foi feito" }));

    expect(screen.getByRole("tab", { name: "Como foi feito" })).toHaveAttribute("aria-selected", "true");
    const painel = screen.getByRole("tabpanel");
    for (const titulo of [
      "Arquitetura, POO e SOLID",
      "Docker Compose",
      "Testes",
      "CI/CD e deploy",
      "Logs, traces e performance",
      "Decisões e o que ficou de fora",
      "Como o time trabalhou",
      "Uso de IA",
      "Limitações e próximos passos",
    ]) {
      expect(within(painel).getByRole("heading", { level: 2, name: titulo })).toBeInTheDocument();
    }
    expect(within(painel).getByRole("link", { name: "Arquitetura completa" })).toHaveAttribute(
      "href",
      `${REPOSITORIO}/blob/main/docs/arquitetura.md`
    );
    expect(within(painel).getByRole("link", { name: "Testes" })).toHaveAttribute("href", "#testes");
  });

  it("abre direto na aba da URL e volta para A ferramenta com uma aba que não existe", () => {
    const { unmount } = renderWithProviders(<SobrePage />, { rota: "/sobre?aba=projeto" });
    expect(screen.getByRole("tab", { name: "Como foi feito" })).toHaveAttribute("aria-selected", "true");
    unmount();

    renderWithProviders(<SobrePage />, { rota: "/sobre?aba=xyz" });
    expect(screen.getByRole("tab", { name: "A ferramenta" })).toHaveAttribute("aria-selected", "true");
  });
});
