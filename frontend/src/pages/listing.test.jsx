import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http as rota, HttpResponse } from "msw";
import { Route, Routes, useLocation } from "react-router-dom";
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

function Destino() {
  const location = useLocation();
  return <p>Em {location.pathname} vindo de {location.state?.de}</p>;
}

function renderizarSemSessao(endereco) {
  return renderWithProviders(
    <Routes>
      <Route path="/marketplace/:id" element={<ListingPage />} />
      <Route path="/login" element={<Destino />} />
      <Route path="/register" element={<Destino />} />
    </Routes>,
    { rota: endereco, service: criarSessaoFalsa(null) }
  );
}

describe("Página do anúncio: não encontrado e voltar depois do login", () => {
  it("anúncio que não existe mostra a página 404 com Anúncio não encontrado", async () => {
    server.use(
      rota.get(url("/listings/00000000-0000-0000-0000-000000000000"), () =>
        HttpResponse.json({ success: false, error: "Anúncio não encontrado" }, { status: 404 })
      )
    );

    renderizarSemSessao("/marketplace/00000000-0000-0000-0000-000000000000");

    expect(await screen.findByRole("heading", { name: "Anúncio não encontrado." })).toBeInTheDocument();
    expect(screen.getByLabelText("Erro 404")).toBeInTheDocument();
  });

  it("id que nem é um id válido também mostra a página 404", async () => {
    server.use(
      rota.get(url("/listings/id-que-nao-existe"), () =>
        HttpResponse.json(
          { success: false, error: "Dados inválidos", details: [{ field: "id", message: "Invalid UUID" }] },
          { status: 400 }
        )
      )
    );

    renderizarSemSessao("/marketplace/id-que-nao-existe");

    expect(await screen.findByRole("heading", { name: "Anúncio não encontrado." })).toBeInTheDocument();
  });

  it("outro erro continua com o aviso e o Tentar de novo", async () => {
    server.use(rota.get(url("/listings/anuncio-1"), () => HttpResponse.json({ success: false, error: "Erro" }, { status: 503 })));

    renderizarSemSessao("/marketplace/anuncio-1");

    expect(await screen.findByRole("heading", { name: "Não foi possível carregar o anúncio" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tentar de novo" })).toBeInTheDocument();
  });

  it.each([
    ["Entrar para negociar", "/login"],
    ["Criar uma conta", "/register"],
  ])("deslogado, %s leva junto o anúncio para voltar depois", async (rotulo, caminho) => {
    server.use(rota.get(url("/listings/anuncio-1"), () => HttpResponse.json({ success: true, data: { listing: anuncio } })));

    renderizarSemSessao("/marketplace/anuncio-1");
    await userEvent.click(await screen.findByRole("link", { name: rotulo }));

    expect(screen.getByText(`Em ${caminho} vindo de /marketplace/anuncio-1`)).toBeInTheDocument();
  });
});
