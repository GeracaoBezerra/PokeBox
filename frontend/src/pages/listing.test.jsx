import { screen } from "@testing-library/react";
import { http as rota, HttpResponse } from "msw";
import { Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { CONFIG } from "../config";
import { renderWithProviders } from "../test/renderWithProviders";
import { server } from "../test/server";
import { criarSessaoFalsa } from "../test/sessaoFalsa";
import ListingPage from "./listing";

const url = (caminho) => `${CONFIG.apiBaseUrl}${caminho}`;

const anuncio = {
  id: "anuncio-1",
  status: "ACTIVE",
  quantity: 1,
  description: null,
  createdAt: "2026-11-01T12:00:00.000Z",
  card: { id: "base1-4", name: "Charizard", setName: "Base", number: "4", imageUrl: null },
  item: { finish: "HOLO", firstEdition: false, condition: "NEAR_MINT" },
  owner: { username: "ash", name: "Ash Ketchum" },
};

function preparar(enviadas, mudancas = {}) {
  server.use(
    rota.get(url("/auth/me"), () =>
      HttpResponse.json({ success: true, data: { user: { username: "misty", name: "Misty", role: "USER" } } })
    ),
    rota.get(url("/listings/anuncio-1"), () => HttpResponse.json({ success: true, data: { listing: { ...anuncio, ...mudancas } } })),
    rota.get(url("/offers/me"), () => HttpResponse.json({ success: true, data: { sent: enviadas, received: [] } })),
    rota.get(url("/collection"), () =>
      HttpResponse.json({ success: true, data: { items: [] }, pagination: { hasNextPage: false } })
    )
  );
}

function renderizar() {
  return renderWithProviders(
    <Routes>
      <Route path="/marketplace/:id" element={<ListingPage />} />
    </Routes>,
    { rota: "/marketplace/anuncio-1", service: criarSessaoFalsa({ name: "Misty", username: "misty" }) }
  );
}

describe("Página do anúncio", () => {
  it("com oferta aberta neste anúncio, não mostra o formulário e leva para Propostas", async () => {
    preparar([{ id: "oferta-1", status: "PROPOSED", listing: { id: "anuncio-1" } }]);

    renderizar();

    expect(await screen.findByRole("heading", { name: "Você já fez uma oferta aqui" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver em Propostas" })).toHaveAttribute("href", "/propostas?aba=enviadas");
    expect(screen.queryByRole("heading", { name: "Monte sua oferta" })).not.toBeInTheDocument();
  });

  it("com oferta aberta só em outro anúncio, mostra o formulário", async () => {
    preparar([{ id: "oferta-2", status: "PROPOSED", listing: { id: "anuncio-2" } }]);

    renderizar();

    expect(await screen.findByRole("heading", { name: "Monte sua oferta" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Você já fez uma oferta aqui" })).not.toBeInTheDocument();
  });

  it("anúncio em troca mostra o selo e o aviso, sem formulário de oferta", async () => {
    preparar([], { status: "IN_TRADE", quantity: 0 });

    renderizar();

    expect(await screen.findByRole("heading", { name: "Este anúncio está em troca no momento." })).toBeInTheDocument();
    expect(screen.getByText("Em troca")).toBeInTheDocument();
    expect(screen.getByText("Nenhuma no momento")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Monte sua oferta" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Fazer uma oferta/ })).not.toBeInTheDocument();
  });

  it("anúncio em troca com oferta sua em espera continua dizendo que você já ofertou", async () => {
    preparar([{ id: "oferta-1", status: "PROPOSED", onHold: true, listing: { id: "anuncio-1" } }], { status: "IN_TRADE", quantity: 0 });

    renderizar();

    expect(await screen.findByRole("heading", { name: "Você já fez uma oferta aqui" })).toBeInTheDocument();
    expect(screen.getByText(/Se a troca não acontecer, sua oferta volta a valer\./)).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Monte sua oferta" })).not.toBeInTheDocument();
  });
});
