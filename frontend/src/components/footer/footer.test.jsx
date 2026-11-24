import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithProviders } from "../../test/renderWithProviders";
import Footer from "./footer";

const REPOSITORIO = "https://github.com/GeracaoBezerra/PokeBox";

describe("Rodapé", () => {
  it("tem os links de Informação, com Segurança e Trabalhe Conosco levando à página não encontrada", () => {
    renderWithProviders(<Footer />);

    const informacao = within(screen.getByRole("navigation", { name: "Informação" }));
    expect(informacao.getByRole("link", { name: "Sobre PokeBox" })).toHaveAttribute("href", "/sobre");
    expect(informacao.getByRole("link", { name: "Como funciona" })).toHaveAttribute("href", "/#como-funciona");
    expect(informacao.getByRole("link", { name: "Segurança" })).toHaveAttribute("href", "/seguranca");
    expect(informacao.getByRole("link", { name: "Trabalhe Conosco" })).toHaveAttribute("href", "/trabalhe-conosco");
    expect(informacao.getByRole("link", { name: "Wishlist" })).toHaveAttribute("href", "/procuro");
  });

  it("leva as categorias aos filtros do catálogo e do marketplace", () => {
    renderWithProviders(<Footer />);

    const categorias = within(screen.getByRole("navigation", { name: "Categorias" }));
    expect(categorias.getByRole("link", { name: "Cartas Raras" })).toHaveAttribute("href", "/catalogo?rarity=Rara");
    expect(categorias.getByRole("link", { name: "Cartas de Treinadores" })).toHaveAttribute("href", "/catalogo?category=Treinador");
    expect(categorias.getByRole("link", { name: "Cartas Foil" })).toHaveAttribute("href", "/marketplace?finish=HOLO");
  });

  it("mostra Instagram e LinkedIn dentro do site e o GitHub no repositório", () => {
    renderWithProviders(<Footer />);

    expect(screen.getByRole("link", { name: "Instagram da PokeBox" })).toHaveAttribute("href", "/instagram");
    expect(screen.getByRole("link", { name: "LinkedIn da PokeBox" })).toHaveAttribute("href", "/linkedin");
    expect(screen.getByRole("link", { name: "GitHub da PokeBox" })).toHaveAttribute("href", REPOSITORIO);
  });

  it("mostra o contato no lugar do bloco do projeto", () => {
    renderWithProviders(<Footer />);

    expect(screen.getByRole("heading", { name: "Contato" })).toBeInTheDocument();
    expect(screen.getByText(/Rua dos Treinadores, 1500/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "+55 (11) 4002-8922" })).toHaveAttribute("href", "tel:+551140028922");
    expect(screen.queryByRole("heading", { name: "Projeto do curso Geração Tech" })).not.toBeInTheDocument();
  });
});
