import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useAcao } from "../../hooks/useAcao";
import { useToast } from "../../hooks/useToast";
import ToastProvider from "./ToastProvider";

function Botoes() {
  const toast = useToast();
  return (
    <>
      <button onClick={() => toast.sucesso("Carta adicionada.")}>Sucesso</button>
      <button onClick={() => toast.erro("Deu ruim.")}>Erro</button>
      <button onClick={() => toast.info("Saiu da wishlist.", { acao: { rotulo: "Desfazer", onClick: desfazer } })}>
        Info
      </button>
    </>
  );
}

const desfazer = vi.fn();

function renderizar(conteudo = <Botoes />) {
  return render(<ToastProvider>{conteudo}</ToastProvider>);
}

afterEach(() => {
  vi.useRealTimers();
  desfazer.mockClear();
});

describe("ToastProvider", () => {
  it("as regiões vivas existem desde o início, mesmo vazias", () => {
    renderizar();

    expect(screen.getByRole("status")).toBeEmptyDOMElement();
    expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");
    expect(screen.getByRole("alert")).toBeEmptyDOMElement();
  });

  it("sucesso aparece na região status e erro na região alert", async () => {
    renderizar();

    await userEvent.click(screen.getByRole("button", { name: "Sucesso" }));
    await userEvent.click(screen.getByRole("button", { name: "Erro" }));

    expect(screen.getByRole("status")).toHaveTextContent("Carta adicionada.");
    expect(screen.getByRole("alert")).toHaveTextContent("Deu ruim.");
  });

  it("some sozinho depois de alguns segundos", () => {
    vi.useFakeTimers();
    renderizar();

    act(() => screen.getByRole("button", { name: "Sucesso" }).click());
    expect(screen.getByText("Carta adicionada.")).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(4000));
    expect(screen.queryByText("Carta adicionada.")).not.toBeInTheDocument();
  });

  it("fecha no botão de fechar", async () => {
    renderizar();

    await userEvent.click(screen.getByRole("button", { name: "Sucesso" }));
    await userEvent.click(screen.getByRole("button", { name: "Fechar aviso" }));

    expect(screen.queryByText("Carta adicionada.")).not.toBeInTheDocument();
  });

  it("botão de ação chama a função e fecha o toast", async () => {
    renderizar();

    await userEvent.click(screen.getByRole("button", { name: "Info" }));
    await userEvent.click(screen.getByRole("button", { name: "Desfazer" }));

    expect(desfazer).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Saiu da wishlist.")).not.toBeInTheDocument();
  });

  it("useAcao mostra o toast de sucesso e continua devolvendo sucesso", async () => {
    function Acao() {
      const acao = useAcao();
      return (
        <>
          <button onClick={() => acao.executar(async () => {}, "Item atualizado.")}>Salvar</button>
          <p>sucesso: {acao.sucesso ?? "nada"}</p>
        </>
      );
    }
    renderizar(<Acao />);

    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));

    expect(screen.getByRole("status")).toHaveTextContent("Item atualizado.");
    expect(screen.getByText("sucesso: Item atualizado.")).toBeInTheDocument();
  });
});
