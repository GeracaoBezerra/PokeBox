import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithProviders } from "../../test/renderWithProviders";
import { criarSessaoFalsa } from "../../test/sessaoFalsa";
import CtaColecao from "./CtaColecao";

describe("CtaColecao", () => {
  it("logado, leva ao catálogo", () => {
    renderWithProviders(<CtaColecao />);

    expect(screen.getByRole("link", { name: "Começar minha coleção" })).toHaveAttribute("href", "/catalogo");
  });

  it("deslogado, leva ao cadastro", () => {
    renderWithProviders(<CtaColecao />, { service: criarSessaoFalsa(null) });

    expect(screen.getByRole("link", { name: "Começar minha coleção" })).toHaveAttribute("href", "/register");
  });

  it("é a seção de destino do link Como funciona", () => {
    renderWithProviders(<CtaColecao />);

    expect(screen.getByRole("region", { name: /Monte sua coleção/ })).toHaveAttribute("id", "como-funciona");
  });
});
