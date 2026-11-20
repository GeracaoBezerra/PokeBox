import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useCarregar } from "./useCarregar";

function promessaNaMao() {
  let resolver;
  let rejeitar;
  const promessa = new Promise((res, rej) => {
    resolver = res;
    rejeitar = rej;
  });
  return { promessa, resolver, rejeitar };
}

describe("useCarregar", () => {
  it("começa carregando e depois entrega os dados", async () => {
    const carregar = vi.fn().mockResolvedValue(["pikachu"]);
    const { result } = renderHook(() => useCarregar(carregar));

    expect(result.current.carregando).toBe(true);
    expect(result.current.dados).toBeNull();
    await waitFor(() => expect(result.current.carregando).toBe(false));
    expect(result.current.dados).toEqual(["pikachu"]);
    expect(result.current.erro).toBeNull();
    expect(carregar).toHaveBeenCalledTimes(1);
  });

  it("entrega o erro quando a carga falha e os dados ficam nulos", async () => {
    const falha = new Error("fora do ar");
    const { result } = renderHook(() => useCarregar(() => Promise.reject(falha)));

    await waitFor(() => expect(result.current.erro).toBe(falha));
    expect(result.current.dados).toBeNull();
    expect(result.current.carregando).toBe(false);
  });

  it("recarregar chama de novo, volta a mostrar carregando e entrega os dados novos", async () => {
    const carregar = vi.fn().mockResolvedValueOnce(["pikachu"]).mockResolvedValueOnce(["pikachu", "eevee"]);
    const { result } = renderHook(() => useCarregar(carregar));
    await waitFor(() => expect(result.current.carregando).toBe(false));

    act(() => result.current.recarregar());

    expect(result.current.carregando).toBe(true);
    await waitFor(() => expect(result.current.dados).toEqual(["pikachu", "eevee"]));
    expect(carregar).toHaveBeenCalledTimes(2);
  });

  it("durante o recarregamento depois de um erro, o erro antigo some", async () => {
    const segunda = promessaNaMao();
    const carregar = vi.fn().mockRejectedValueOnce(new Error("fora do ar")).mockReturnValueOnce(segunda.promessa);
    const { result } = renderHook(() => useCarregar(carregar));
    await waitFor(() => expect(result.current.erro).not.toBeNull());

    act(() => result.current.recarregar());

    expect(result.current.carregando).toBe(true);
    expect(result.current.erro).toBeNull();
    await act(async () => segunda.resolver(["mew"]));
    expect(result.current.dados).toEqual(["mew"]);
  });

  it("trocar a chave chama carregar de novo e mostra carregando até a resposta nova", async () => {
    const carregar = vi.fn().mockResolvedValue([]);
    const { result, rerender } = renderHook(({ chave }) => useCarregar(carregar, chave), { initialProps: { chave: "a" } });
    await waitFor(() => expect(result.current.carregando).toBe(false));

    rerender({ chave: "b" });

    expect(result.current.carregando).toBe(true);
    await waitFor(() => expect(result.current.carregando).toBe(false));
    expect(carregar).toHaveBeenCalledTimes(2);
  });

  it("usa a função carregar mais recente na troca de chave", async () => {
    const { result, rerender } = renderHook(({ chave }) => useCarregar(() => Promise.resolve(`dados de ${chave}`), chave), {
      initialProps: { chave: "ash" },
    });
    await waitFor(() => expect(result.current.dados).toBe("dados de ash"));

    rerender({ chave: "misty" });

    await waitFor(() => expect(result.current.dados).toBe("dados de misty"));
  });

  it("resposta atrasada da chave antiga não sobrescreve a da chave nova", async () => {
    const antiga = promessaNaMao();
    const nova = promessaNaMao();
    const respostas = { a: antiga.promessa, b: nova.promessa };
    const { result, rerender } = renderHook(({ chave }) => useCarregar(() => respostas[chave], chave), {
      initialProps: { chave: "a" },
    });

    rerender({ chave: "b" });
    await act(async () => nova.resolver("da chave b"));
    await act(async () => antiga.resolver("da chave a"));

    expect(result.current.dados).toBe("da chave b");
    expect(result.current.carregando).toBe(false);
  });
});
