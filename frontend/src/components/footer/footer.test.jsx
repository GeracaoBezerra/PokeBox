import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithProviders } from "../../test/renderWithProviders";
import Footer from "./footer";

const REPOSITORIO = "https://github.com/GeracaoBezerra/PokeBox";

describe("Rodapé", () => {
  it("leva cada link interno a uma rota que existe", () => {
    renderWithProviders(<Footer />);

    const informacao = within(screen.getByRole("navigation", { name: "Informação" }));
    expect(informacao.getByRole("link", { name: "Sobre PokeBox" })).toHaveAttribute("href", "/sobre");
    expect(informacao.getByRole("link", { name: "Como funciona" })).toHaveAttribute("href", "/#como-funciona");
    expect(informacao.getByRole("link", { name: "Wishlist" })).toHaveAttribute("href", "/procuro");

    const explorar = within(screen.getByRole("navigation", { name: "Explorar" }));
    expect(explorar.getByRole("link", { name: "Catálogo" })).toHaveAttribute("href", "/catalogo");
    expect(explorar.getByRole("link", { name: "Marketplace" })).toHaveAttribute("href", "/marketplace");
    expect(explorar.getByRole("link", { name: "Mais desejadas" })).toHaveAttribute("href", "/catalogo?sort=wanted&order=desc");
  });

  it("não tem links de páginas que não existem", () => {
    renderWithProviders(<Footer />);

    expect(screen.queryByRole("link", { name: "Segurança" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Trabalhe Conosco" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Instagram|LinkedIn/ })).not.toBeInTheDocument();
    expect(screen.queryByText(/Rua dos Treinadores/)).not.toBeInTheDocument();
  });

  it("aponta o GitHub e o bloco do projeto para o repositório", () => {
    renderWithProviders(<Footer />);

    expect(screen.getByRole("link", { name: "GitHub da PokeBox" })).toHaveAttribute("href", REPOSITORIO);
    expect(screen.getByRole("heading", { name: "Projeto do curso Geração Tech" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "repositório do GitHub" })).toHaveAttribute("href", REPOSITORIO);
  });
});
