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

  it("reserva o espaço da carta com largura, altura e decodificação assíncrona", () => {
    render(<ImagemCarta src="a.webp" alt="Pikachu" className="minha" />);
    const imagem = screen.getByRole("img", { name: "Pikachu" });
    expect(imagem).toHaveAttribute("width", "245");
    expect(imagem).toHaveAttribute("height", "342");
    expect(imagem).toHaveAttribute("decoding", "async");
    expect(imagem).toHaveClass("minha");
  });
});
