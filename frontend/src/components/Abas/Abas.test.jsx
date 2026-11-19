import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import Abas from "./Abas";

const ABAS = [
  { valor: "ativos", rotulo: "Ativos", contagem: 3 },
  { valor: "pausados", rotulo: "Pausados" },
  { valor: "fechados", rotulo: "Fechados" },
];

function AbasComEstado({ inicial = "ativos", onSelecionar = () => {} }) {
  const [selecionada, setSelecionada] = useState(inicial);
  return (
    <Abas
      rotulo="Anúncios"
      abas={ABAS}
      selecionada={selecionada}
      onSelecionar={(valor) => {
        setSelecionada(valor);
        onSelecionar(valor);
      }}
      idPainel="painel"
    />
  );
}

describe("Abas", () => {
  it("monta o grupo de abas com os papéis e estados do padrão", () => {
    render(<AbasComEstado />);

    expect(screen.getByRole("tablist", { name: "Anúncios" })).toBeInTheDocument();
    const ativa = screen.getByRole("tab", { name: "Ativos (3)" });
    expect(ativa).toHaveAttribute("aria-selected", "true");
    expect(ativa).toHaveAttribute("aria-controls", "painel");
    expect(ativa).toHaveAttribute("tabindex", "0");
    const outra = screen.getByRole("tab", { name: "Pausados" });
    expect(outra).toHaveAttribute("aria-selected", "false");
    expect(outra).toHaveAttribute("tabindex", "-1");
  });

  it("o Tab para só na aba ativa", async () => {
    const usuario = userEvent.setup();
    render(
      <>
        <AbasComEstado inicial="pausados" />
        <button type="button">Depois</button>
      </>
    );

    await usuario.tab();
    expect(screen.getByRole("tab", { name: "Pausados" })).toHaveFocus();
    await usuario.tab();
    expect(screen.getByRole("button", { name: "Depois" })).toHaveFocus();
  });

  it("as setas trocam de aba, dão a volta e levam o foco junto", async () => {
    const usuario = userEvent.setup();
    const onSelecionar = vi.fn();
    render(<AbasComEstado onSelecionar={onSelecionar} />);

    await usuario.click(screen.getByRole("tab", { name: "Ativos (3)" }));
    await usuario.keyboard("{ArrowRight}");
    const pausados = screen.getByRole("tab", { name: "Pausados" });
    expect(pausados).toHaveFocus();
    expect(pausados).toHaveAttribute("aria-selected", "true");

    await usuario.keyboard("{ArrowLeft}{ArrowLeft}");
    expect(screen.getByRole("tab", { name: "Fechados" })).toHaveFocus();
    expect(onSelecionar).toHaveBeenLastCalledWith("fechados");
  });

  it("Home vai para a primeira e End para a última", async () => {
    const usuario = userEvent.setup();
    render(<AbasComEstado inicial="pausados" />);

    await usuario.tab();
    await usuario.keyboard("{End}");
    expect(screen.getByRole("tab", { name: "Fechados" })).toHaveAttribute("aria-selected", "true");
    await usuario.keyboard("{Home}");
    expect(screen.getByRole("tab", { name: "Ativos (3)" })).toHaveFocus();
  });

  it("clicar seleciona a aba", async () => {
    const usuario = userEvent.setup();
    const onSelecionar = vi.fn();
    render(<AbasComEstado onSelecionar={onSelecionar} />);

    await usuario.click(screen.getByRole("tab", { name: "Fechados" }));
    expect(onSelecionar).toHaveBeenCalledWith("fechados");
    expect(screen.getByRole("tab", { name: "Fechados" })).toHaveAttribute("aria-selected", "true");
  });
});
