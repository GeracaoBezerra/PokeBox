import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithProviders } from "../../test/renderWithProviders";
import { criarSessaoFalsa } from "../../test/sessaoFalsa";
import BannerSwiper from "./BannerSwiper";

describe("BannerSwiper", () => {
  it("deslogado, todos os botões levam a páginas públicas", () => {
    renderWithProviders(<BannerSwiper />, { service: criarSessaoFalsa(null) });

    expect(screen.getAllByRole("link", { name: "Explorar cartas" })[0]).toHaveAttribute("href", "/catalogo");
    expect(screen.getAllByRole("link", { name: "Ver marketplace" })[0]).toHaveAttribute("href", "/marketplace");
    expect(screen.getAllByRole("link", { name: "Explorar o catálogo" })[0]).toHaveAttribute("href", "/catalogo");
  });
});
