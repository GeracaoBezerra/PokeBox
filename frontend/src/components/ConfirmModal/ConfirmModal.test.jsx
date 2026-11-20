import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import ConfirmModal from "./ConfirmModal";

function renderizar(props = {}) {
  const onConfirmar = vi.fn();
  const onCancelar = vi.fn();
  render(
    <ConfirmModal
      aberto
      titulo="Apagar carta da coleção?"
      mensagem="Pikachu sai da sua coleção."
      textoConfirmar="Apagar"
      perigo
      onConfirmar={onConfirmar}
      onCancelar={onCancelar}
      {...props}
    />
  );
  return { onConfirmar, onCancelar };
}

describe("ConfirmModal", () => {
  it("abre com o título, a mensagem e o foco em Cancelar", () => {
    renderizar();

    const dialogo = screen.getByRole("dialog", { name: "Apagar carta da coleção?" });
    expect(dialogo).toHaveAttribute("open");
    expect(dialogo).toHaveAccessibleDescription("Pikachu sai da sua coleção.");
    expect(screen.getByRole("button", { name: "Cancelar" })).toHaveFocus();
  });

  it("não aparece fechado", () => {
    renderizar({ aberto: false });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("chama onConfirmar e onCancelar nos botões", async () => {
    const { onConfirmar, onCancelar } = renderizar();

    await userEvent.click(screen.getByRole("button", { name: "Apagar" }));
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(onConfirmar).toHaveBeenCalledTimes(1);
    expect(onCancelar).toHaveBeenCalledTimes(1);
  });

  it("Esc cancela", async () => {
    const { onCancelar } = renderizar();

    await userEvent.keyboard("{Escape}");

    expect(onCancelar).toHaveBeenCalledTimes(1);
  });

  it("desativa o confirmar com confirmarDesativado e mostra o conteúdo extra", () => {
    renderizar({ confirmarDesativado: true, children: <label>Digite ash</label> });

    expect(screen.getByRole("button", { name: "Apagar" })).toBeDisabled();
    expect(screen.getByText("Digite ash")).toBeInTheDocument();
  });

  it("mostra Aguarde... e desativa os botões quando ocupado", () => {
    renderizar({ ocupado: true });

    expect(screen.getByRole("button", { name: "Aguarde..." })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeDisabled();
  });

  it("sem onConfirmar, mostra só o botão de fechar e o conteúdo", () => {
    renderizar({ onConfirmar: undefined, mensagem: undefined, textoCancelar: "Fechar", children: <form aria-label="Adicionar" /> });

    expect(screen.getAllByRole("button")).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Fechar" })).toBeInTheDocument();
    expect(screen.getByRole("form", { name: "Adicionar" })).toBeInTheDocument();
  });
});
