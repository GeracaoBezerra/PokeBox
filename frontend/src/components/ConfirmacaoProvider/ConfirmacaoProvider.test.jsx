import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { useConfirmacao } from "../../hooks/useConfirmacao";
import ConfirmacaoProvider from "./ConfirmacaoProvider";

function Tela() {
  const { pedir } = useConfirmacao();
  const [resposta, setResposta] = useState("nenhuma");

  async function perguntar() {
    const confirmou = await pedir({ titulo: "Fechar anúncio?", mensagem: "Não dá para reabrir.", textoConfirmar: "Fechar" });
    setResposta(String(confirmou));
  }

  return (
    <>
      <button onClick={perguntar}>Perguntar</button>
      <p>resposta: {resposta}</p>
    </>
  );
}

function renderizar() {
  render(
    <ConfirmacaoProvider>
      <Tela />
    </ConfirmacaoProvider>
  );
}

describe("ConfirmacaoProvider e useConfirmacao", () => {
  it("abre o modal com os textos pedidos", async () => {
    renderizar();

    await userEvent.click(screen.getByRole("button", { name: "Perguntar" }));

    expect(screen.getByRole("dialog", { name: "Fechar anúncio?" })).toHaveTextContent("Não dá para reabrir.");
  });

  it("confirmar resolve true e fecha o modal", async () => {
    renderizar();

    await userEvent.click(screen.getByRole("button", { name: "Perguntar" }));
    await userEvent.click(screen.getByRole("button", { name: "Fechar" }));

    expect(await screen.findByText("resposta: true")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("cancelar resolve false", async () => {
    renderizar();

    await userEvent.click(screen.getByRole("button", { name: "Perguntar" }));
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(await screen.findByText("resposta: false")).toBeInTheDocument();
  });

  it("Esc resolve false", async () => {
    renderizar();

    await userEvent.click(screen.getByRole("button", { name: "Perguntar" }));
    await userEvent.keyboard("{Escape}");

    expect(await screen.findByText("resposta: false")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
