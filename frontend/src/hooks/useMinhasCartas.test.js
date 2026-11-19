import { act, renderHook, waitFor } from "@testing-library/react";
import { http as rota, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { CONFIG } from "../config";
import { server } from "../test/server";
import { useMinhasCartas } from "./useMinhasCartas";

const url = (caminho) => `${CONFIG.apiBaseUrl}${caminho}`;
const session = { user: { username: "ash" } };
const lista = (items) => HttpResponse.json({ success: true, data: { items } });
const foraDoAr = () => HttpResponse.json({ success: false, error: "fora" }, { status: 503 });

describe("useMinhasCartas", () => {
  it("se a wishlist falha na primeira vez, não entrega estado vazio: fica sem dados e com erro", async () => {
    server.use(rota.get(url("/wishlist"), foraDoAr), rota.get(url("/collection"), () => lista([{ id: "c1", cardId: "base1-4" }])));

    const { result } = renderHook(() => useMinhasCartas(session));

    await waitFor(() => expect(result.current.erro).toMatchObject({ status: 503 }));
    expect(result.current.minhas).toBeNull();
  });

  it("se a wishlist falha num recarregamento, mantém a última wishlist e atualiza a coleção", async () => {
    let wishlistNoAr = true;
    let colecao = [{ id: "c1", cardId: "base1-4" }];
    server.use(
      rota.get(url("/wishlist"), () => (wishlistNoAr ? lista([{ id: "w1", cardId: "sv02-1" }]) : foraDoAr())),
      rota.get(url("/collection"), () => lista(colecao))
    );

    const { result } = renderHook(() => useMinhasCartas(session));
    await waitFor(() => expect(result.current.minhas?.naWishlist.get("sv02-1")).toBe("w1"));

    wishlistNoAr = false;
    colecao = [...colecao, { id: "c2", cardId: "base1-2" }];
    act(() => result.current.recarregar());

    await waitFor(() => expect(result.current.erro).toMatchObject({ status: 503 }));
    expect(result.current.minhas.naWishlist.get("sv02-1")).toBe("w1");
    expect(result.current.minhas.tenho.has("base1-2")).toBe(true);
  });

  it("sem login, não consulta nada", async () => {
    const { result } = renderHook(() => useMinhasCartas(null));

    await waitFor(() => expect(result.current.carregando).toBe(false));
    expect(result.current.minhas).toBeNull();
    expect(result.current.erro).toBeNull();
  });
});
