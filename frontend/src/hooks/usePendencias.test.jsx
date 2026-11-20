import { act, renderHook, waitFor } from "@testing-library/react";
import { http as rota, HttpResponse } from "msw";
import { MemoryRouter, useNavigate } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../auth/authProvider";
import { CONFIG } from "../config";
import { criarSessaoFalsa } from "../test/sessaoFalsa";
import { server } from "../test/server";
import { avisarQuePendenciasMudaram, usePendencias } from "./usePendencias";

const url = (caminho) => `${CONFIG.apiBaseUrl}${caminho}`;
const itens = (quantos) => Array.from({ length: quantos }, (_, i) => ({ id: `i${i}` }));

function apiDasPendencias({ ofertas = 0, trocas = 0 } = {}) {
  const pedidos = [];
  const atual = { ofertas, trocas };
  server.use(
    rota.get(url("/offers/me"), ({ request }) => {
      pedidos.push(`offers ${new URL(request.url).searchParams.get("status")}`);
      return HttpResponse.json({ success: true, data: { sent: itens(5), received: itens(atual.ofertas) } });
    }),
    rota.get(url("/trades/me"), ({ request }) => {
      pedidos.push(`trades ${new URL(request.url).searchParams.get("status")}`);
      return HttpResponse.json({ success: true, data: { sent: itens(5), received: itens(atual.trocas) } });
    })
  );
  return { pedidos, atual };
}

function renderizar(service) {
  const wrapper = ({ children }) => (
    <MemoryRouter initialEntries={["/"]}>
      <AuthProvider service={service}>{children}</AuthProvider>
    </MemoryRouter>
  );
  return renderHook(
    () => {
      const navegar = useNavigate();
      return { pendencias: usePendencias(), navegar };
    },
    { wrapper }
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("usePendencias", () => {
  it("sem login, devolve zero e não chama a API", async () => {
    const { pedidos } = apiDasPendencias({ ofertas: 2, trocas: 1 });
    const { result } = renderizar(criarSessaoFalsa(null));

    await act(async () => {});

    expect(result.current.pendencias).toEqual({ ofertas: 0, trocas: 0 });
    expect(pedidos).toEqual([]);
  });

  it("com login, conta só as ofertas e trocas recebidas que aguardam resposta", async () => {
    const { pedidos } = apiDasPendencias({ ofertas: 2, trocas: 1 });
    const { result } = renderizar(criarSessaoFalsa());

    await waitFor(() => expect(result.current.pendencias).toEqual({ ofertas: 2, trocas: 1 }));
    expect(pedidos.sort()).toEqual(["offers PROPOSED", "trades PROPOSED"]);
  });

  it("o aviso de que as pendências mudaram conta de novo", async () => {
    const { atual } = apiDasPendencias({ ofertas: 2 });
    const { result } = renderizar(criarSessaoFalsa());
    await waitFor(() => expect(result.current.pendencias.ofertas).toBe(2));

    atual.ofertas = 1;
    act(() => avisarQuePendenciasMudaram());

    await waitFor(() => expect(result.current.pendencias.ofertas).toBe(1));
  });

  it("ao sair da conta, volta a zero", async () => {
    apiDasPendencias({ ofertas: 3, trocas: 2 });
    const service = criarSessaoFalsa();
    const { result } = renderizar(service);
    await waitFor(() => expect(result.current.pendencias.ofertas).toBe(3));

    act(() => service.logout());

    await waitFor(() => expect(result.current.pendencias).toEqual({ ofertas: 0, trocas: 0 }));
  });

  it("ao entrar com outra conta, conta de novo para ela", async () => {
    const { atual, pedidos } = apiDasPendencias({ ofertas: 1 });
    const service = criarSessaoFalsa();
    const { result } = renderizar(service);
    await waitFor(() => expect(result.current.pendencias.ofertas).toBe(1));
    const pedidosDoAsh = pedidos.length;

    atual.ofertas = 4;
    act(() => service.entrar({ name: "Misty", username: "misty" }));

    await waitFor(() => expect(result.current.pendencias.ofertas).toBe(4));
    expect(pedidos.length).toBeGreaterThan(pedidosDoAsh);
  });

  it("trocar de página só conta de novo se já passou um minuto da última contagem", async () => {
    let agora = 1_000_000;
    vi.spyOn(Date, "now").mockImplementation(() => agora);
    const { pedidos, atual } = apiDasPendencias({ ofertas: 1 });
    const { result } = renderizar(criarSessaoFalsa());
    await waitFor(() => expect(result.current.pendencias.ofertas).toBe(1));
    const pedidosDaPrimeiraContagem = pedidos.length;

    atual.ofertas = 2;
    agora += 30 * 1000;
    act(() => result.current.navegar("/colecao"));
    await act(async () => {});
    expect(pedidos).toHaveLength(pedidosDaPrimeiraContagem);
    expect(result.current.pendencias.ofertas).toBe(1);

    agora += 31 * 1000;
    act(() => result.current.navegar("/procuro"));

    await waitFor(() => expect(result.current.pendencias.ofertas).toBe(2));
  });
});
