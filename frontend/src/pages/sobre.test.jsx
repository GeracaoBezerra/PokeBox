import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithProviders } from "../test/renderWithProviders";
import SobrePage from "./sobre";

describe("Página Sobre", () => {
  it("explica o projeto e aponta para o repositório", () => {
    renderWithProviders(<SobrePage />);

    expect(screen.getByRole("heading", { level: 1, name: "Sobre o PokeBox" })).toBeInTheDocument();
    expect(screen.getByText(/plataforma de trocas de cartas de Pokémon TCG/)).toBeInTheDocument();
    expect(screen.getByText(/projeto do curso Geração Tech/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "repositório do GitHub" })).toHaveAttribute(
      "href",
      "https://github.com/GeracaoBezerra/PokeBox"
    );
    expect(screen.getByRole("link", { name: "Veja como funciona" })).toHaveAttribute("href", "/#como-funciona");
  });
});
