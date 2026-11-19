import { act, renderHook, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ToastProvider from "../components/ToastProvider/ToastProvider";
import { useAcao } from "./useAcao";

const comToast = ({ children }) => <ToastProvider>{children}</ToastProvider>;

function renderizar() {
  return renderHook(() => useAcao(), { wrapper: comToast });
}

describe("useAcao", () => {
  it("ação que dá certo devolve ok com o resultado, guarda a mensagem e mostra o toast", async () => {
    const { result } = renderizar();

    let retorno;
    await act(async () => {
      retorno = await result.current.executar(() => Promise.resolve({ id: "c1" }), "Carta adicionada à coleção.");
    });

    expect(retorno).toEqual({ ok: true, resultado: { id: "c1" } });
    expect(result.current.sucesso).toBe("Carta adicionada à coleção.");
    expect(result.current.erro).toBeNull();
    expect(screen.getByRole("status")).toHaveTextContent("Carta adicionada à coleção.");
  });

  it("sem mensagem, dá certo sem guardar sucesso nem mostrar toast", async () => {
    const { result } = renderizar();

    await act(async () => {
      await result.current.executar(() => Promise.resolve());
    });

    expect(result.current.sucesso).toBeNull();
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("ação que falha devolve ok falso com o erro e guarda o erro, sem toast de sucesso", async () => {
    const falha = Object.assign(new Error("Conflito"), { status: 409 });
    const { result } = renderizar();

    let retorno;
    await act(async () => {
      retorno = await result.current.executar(() => Promise.reject(falha), "Carta adicionada à coleção.");
    });

    expect(retorno).toEqual({ ok: false, erro: falha });
    expect(result.current.erro).toBe(falha);
    expect(result.current.sucesso).toBeNull();
    expect(result.current.ocupado).toBe(false);
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("ocupado fica verdadeiro enquanto a ação não termina", async () => {
    let terminar;
    const acao = vi.fn(() => new Promise((resolver) => (terminar = resolver)));
    const { result } = renderizar();

    let execucao;
    act(() => {
      execucao = result.current.executar(acao);
    });
    expect(result.current.ocupado).toBe(true);

    await act(async () => {
      terminar();
      await execucao;
    });
    expect(result.current.ocupado).toBe(false);
  });

  it("uma nova execução limpa o erro da anterior", async () => {
    const { result } = renderizar();
    await act(async () => {
      await result.current.executar(() => Promise.reject(new Error("falhou")));
    });

    await act(async () => {
      await result.current.executar(() => Promise.resolve(), "Pronto.");
    });

    expect(result.current.erro).toBeNull();
    expect(result.current.sucesso).toBe("Pronto.");
  });

  it("o tipo escolhido decide o toast", async () => {
    const { result } = renderizar();

    await act(async () => {
      await result.current.executar(() => Promise.resolve(), "Pikachu saiu da wishlist.", { tipo: "info" });
    });

    expect(screen.getByRole("status")).toHaveTextContent("Pikachu saiu da wishlist.");
  });
});
