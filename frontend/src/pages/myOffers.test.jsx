import { screen, waitFor } from "@testing-library/react";
import { http as rota, HttpResponse } from "msw";
import { useLocation } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { CONFIG } from "../config";
import { renderWithProviders } from "../test/renderWithProviders";
import { server } from "../test/server";
import MyOffersPage from "./myOffers";

const url = (caminho) => `${CONFIG.apiBaseUrl}${caminho}`;

function EstadoDoHistorico() {
  const { state } = useLocation();
  return <output data-testid="estado">{JSON.stringify(state)}</output>;
}

describe("Página de propostas", () => {
  it("mostra o aviso vindo da oferta e tira ele do histórico para não voltar ao recarregar", async () => {
    server.use(
      rota.get(url("/offers/me"), () =>
        HttpResponse.json({ success: true, data: { items: [] }, pagination: { page: 1, limit: 20, hasNextPage: false } })
      ),
      rota.get(url("/trades/me"), () => HttpResponse.json({ success: true, data: { sent: [], received: [] } }))
    );

    renderWithProviders(
      <>
        <MyOffersPage />
        <EstadoDoHistorico />
      </>,
      { rota: { pathname: "/propostas", search: "?aba=enviadas", state: { aviso: "Oferta enviada para @ash." } } }
    );

    expect(screen.getByText("Oferta enviada para @ash.")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId("estado")).toHaveTextContent("null"));
    expect(screen.getByText("Oferta enviada para @ash.")).toBeInTheDocument();
    expect(await screen.findByText("Você ainda não fez ofertas.")).toBeInTheDocument();
  });
});
