import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ImagemCarta from "./ImagemCarta";

describe("ImagemCarta", () => {
  it("sem imagem mostra o placeholder com a descrição da carta", () => {
    render(<ImagemCarta alt="Grass Energy, SVE, Nº 1" />);
    expect(screen.getByRole("img", { name: "Grass Energy, SVE, Nº 1" }).tagName).toBe("DIV");
  });

  it("imagem que falha cai no placeholder e uma src nova tenta de novo", () => {
    const { rerender } = render(<ImagemCarta src="a.webp" alt="Pikachu" />);
    fireEvent.error(screen.getByRole("img", { name: "Pikachu" }));
    expect(screen.getByRole("img", { name: "Pikachu" }).tagName).toBe("DIV");
    rerender(<ImagemCarta src="b.webp" alt="Pikachu" />);
    expect(screen.getByRole("img", { name: "Pikachu" }).tagName).toBe("IMG");
  });
});
