import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useListaPaginada } from "./useListaPaginada";

const pagina = (n, temMais = true) => ({ items: [{ id: `p${n}` }], pagination: { hasNextPage: temMais } });

describe("useListaPaginada", () => {
  it("junta as páginas a cada Carregar mais", async () => {
    const buscar = vi.fn((n) => Promise.resolve(pagina(n, n < 2)));
    const { result } = renderHook(() => useListaPaginada(buscar));

    await waitFor(() => expect(result.current.itens).toEqual([{ id: "p1" }]));
    act(() => result.current.carregarMais());
    await waitFor(() => expect(result.current.itens).toEqual([{ id: "p1" }, { id: "p2" }]));
    expect(result.current.temMais).toBe(false);
  });

  it("quando uma página falha, mantém o que já carregou e o próximo clique repete a mesma página", async () => {
    const falha = Object.assign(new Error("fora do ar"), { status: 503 });
    let falhar = true;
    const buscar = vi.fn((n) => {
      if (n === 2 && falhar) {
        falhar = false;
        return Promise.reject(falha);
      }
      return Promise.resolve(pagina(n));
    });
    const { result } = renderHook(() => useListaPaginada(buscar));

    await waitFor(() => expect(result.current.itens).toEqual([{ id: "p1" }]));
    act(() => result.current.carregarMais());
    await waitFor(() => expect(result.current.erro).toBe(falha));
    expect(result.current.itens).toEqual([{ id: "p1" }]);
    expect(result.current.temMais).toBe(true);

    act(() => result.current.carregarMais());
    await waitFor(() => expect(result.current.itens).toEqual([{ id: "p1" }, { id: "p2" }]));
    expect(buscar.mock.calls.map(([n]) => n)).toEqual([1, 2, 2]);
    expect(result.current.erro).toBeNull();
  });

  it("volta para a página 1 quando a chave muda", async () => {
    const buscar = vi.fn((n) => Promise.resolve(pagina(n)));
    const { result, rerender } = renderHook(({ chave }) => useListaPaginada(buscar, chave), { initialProps: { chave: "a" } });

    await waitFor(() => expect(result.current.itens).toEqual([{ id: "p1" }]));
    act(() => result.current.carregarMais());
    await waitFor(() => expect(result.current.itens).toHaveLength(2));
    rerender({ chave: "b" });
    await waitFor(() => expect(result.current.itens).toEqual([{ id: "p1" }]));
    expect(buscar).toHaveBeenLastCalledWith(1, expect.any(AbortSignal));
  });

  it("atualizarCarregadas busca de novo todas as páginas abertas sem duplicar e mantém os itens enquanto busca", async () => {
    let versao = "a";
    const buscar = vi.fn((n) => Promise.resolve({ items: [{ id: `p${n}${versao}` }], pagination: { hasNextPage: true } }));
    const { result } = renderHook(() => useListaPaginada(buscar));

    await waitFor(() => expect(result.current.itens).toEqual([{ id: "p1a" }]));
    act(() => result.current.carregarMais());
    await waitFor(() => expect(result.current.itens).toHaveLength(2));
    versao = "b";
    act(() => result.current.atualizarCarregadas());
    expect(result.current.itens).toEqual([{ id: "p1a" }, { id: "p2a" }]);
    await waitFor(() => expect(result.current.itens).toEqual([{ id: "p1b" }, { id: "p2b" }]));
    expect(buscar.mock.calls.map(([n]) => n)).toEqual([1, 2, 1, 2]);
  });

  it("tentarDeNovo repete a busca que falhou", async () => {
    const falha = new Error("fora do ar");
    const buscar = vi.fn().mockRejectedValueOnce(falha).mockResolvedValue(pagina(1, false));
    const { result } = renderHook(() => useListaPaginada(buscar));

    await waitFor(() => expect(result.current.erro).toBe(falha));
    expect(result.current.itens).toEqual([]);
    act(() => result.current.tentarDeNovo());
    await waitFor(() => expect(result.current.itens).toEqual([{ id: "p1" }]));
    expect(result.current.erro).toBeNull();
  });
});
