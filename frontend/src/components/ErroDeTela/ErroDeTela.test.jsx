import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ErroDeTela from "./ErroDeTela";

function Quebra() {
  throw new Error("Failed to fetch dynamically imported module");
}

describe("ErroDeTela", () => {
  it("mostra o aviso com o botão de recarregar quando a tela falha", () => {
    const console = vi.spyOn(globalThis.console, "error").mockImplementation(() => {});
    render(
      <ErroDeTela>
        <Quebra />
      </ErroDeTela>,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Não foi possível abrir esta tela");
    expect(screen.getByRole("button", { name: "Recarregar a página" })).toBeInTheDocument();
    console.mockRestore();
  });

  it("mostra a tela normal quando não há erro", () => {
    render(
      <ErroDeTela>
        <p>Tudo certo</p>
      </ErroDeTela>,
    );

    expect(screen.getByText("Tudo certo")).toBeInTheDocument();
  });
});
