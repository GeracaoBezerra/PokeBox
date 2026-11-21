import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithProviders } from "../../test/renderWithProviders";
import CartaAnuncio from "./CartaAnuncio";

const anuncio = {
  id: "anuncio-1",
  status: "ACTIVE",
  quantity: 2,
  card: { id: "base1-4", name: "Charizard", imageUrl: null },
  item: { finish: "HOLO", firstEdition: false, condition: "NEAR_MINT" },
  owner: { username: "ash" },
};

describe("CartaAnuncio", () => {
  it("anúncio ativo mostra a quantidade para troca e nenhum selo de troca", () => {
    renderWithProviders(<CartaAnuncio anuncio={anuncio} />);

    expect(screen.getByText(/2 para troca/)).toBeInTheDocument();
    expect(screen.queryByText("Em troca")).not.toBeInTheDocument();
  });

  it("anúncio em troca ganha o selo e não mostra quantidade", () => {
    renderWithProviders(<CartaAnuncio anuncio={{ ...anuncio, status: "IN_TRADE", quantity: 0 }} />);

    expect(screen.getByText("Em troca")).toBeInTheDocument();
    expect(screen.getByText(/Em negociação/)).toBeInTheDocument();
    expect(screen.queryByText(/para troca/)).not.toBeInTheDocument();
  });
});
