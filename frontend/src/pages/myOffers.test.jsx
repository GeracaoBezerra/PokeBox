import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { Route, Routes, useLocation } from "react-router-dom";
import { expect, it } from "vitest";
import { CONFIG } from "../config";
import { renderWithProviders } from "../test/renderWithProviders";
import { server } from "../test/server";
import MyOffersPage from "./myOffers";

const url = (caminho) => `${CONFIG.apiBaseUrl}${caminho}`;
const oferta = {
  id: "o1",
  status: "PROPOSED",
  createdAt: "2026-11-19T12:00:00Z",
  quantity: 1,
  listing: {
    id: "a1",
    owner: { username: "ash" },
    card: { id: "sm1-9", name: "Rowlet" },
    item: { condition: "MINT", finish: "NORMAL" },
  },
  proposer: { username: "misty" },
  items: [{ collectionItemId: "c1", card: { id: "base1-53", name: "Psyduck" }, quantity: 2, condition: "MINT", finish: "NORMAL" }],
};

function ofertas(items) {
  return HttpResponse.json({ data: { items }, pagination: { hasNextPage: false } });
}

it("mantém as propostas visíveis durante a atualização e remove apenas a que saiu do filtro", async () => {
  let liberarAtualizacao;
  const atualizacao = new Promise((resolve) => { liberarAtualizacao = resolve; });
  let respondida = false;
  const outra = { ...oferta, id: "o2", proposer: { username: "brock" } };
  server.use(
    http.get(url("/offers/me"), async () => {
      if (!respondida) return ofertas([oferta, outra]);
      await atualizacao;
      return ofertas([outra]);
    }),
    http.patch(url("/offers/o1/status"), () => {
      respondida = true;
      return HttpResponse.json({ data: { offer: { ...oferta, status: "REJECTED" } } });
    }),
  );

  renderWithProviders(<MyOffersPage />, { rota: "/propostas?status=PROPOSED" });
  const misty = (await screen.findByRole("heading", { name: "De @misty" })).closest("article");
  const brock = screen.getByRole("heading", { name: "De @brock" }).closest("article");
  expect(within(within(misty).getByRole("region", { name: "Você dá" })).getByRole("link", { name: "Rowlet" })).toBeVisible();
  await userEvent.click(within(misty).getByRole("button", { name: "Recusar" }));
  await userEvent.click(screen.getByRole("button", { name: "Recusar oferta" }));

  expect(await screen.findByText("Oferta recusada.")).toBeVisible();
  expect(misty).toBeVisible();
  expect(brock).toBeVisible();
  expect(screen.queryByRole("status", { name: "Carregando propostas" })).toBeNull();

  liberarAtualizacao();
  await waitFor(() => expect(misty).not.toBeInTheDocument());
  expect(screen.getByRole("heading", { name: "De @brock" }).closest("article")).toBe(brock);
});

it("mostra os lados da proposta enviada e permite expandir um pacote de cartas", async () => {
  const itens = [
    ...oferta.items,
    ...["Bulbasaur", "Squirtle", "Mew"].map((name) => ({
      ...oferta.items[0],
      collectionItemId: name,
      card: { id: name.toLowerCase(), name },
    })),
  ];
  server.use(
    http.get(url("/offers/me"), () => ofertas([{ ...oferta, items: itens, status: "ACCEPTED", tradeId: "t1" }])),
  );

  renderWithProviders(<MyOffersPage />, { rota: "/propostas?aba=enviadas" });

  expect(await screen.findByRole("heading", { name: "Para @ash" })).toBeVisible();
  const oferecidas = within(screen.getByRole("region", { name: "Você dá" }));
  expect(oferecidas.getByRole("link", { name: "Psyduck" })).toBeVisible();
  expect(oferecidas.getAllByRole("listitem")).toHaveLength(2);
  await userEvent.click(oferecidas.getByRole("button", { name: "Ver as 4 cartas" }));
  const galeria = screen.getByRole("dialog", { name: "Você dá · 4 cartas" });
  expect(within(galeria).getAllByRole("listitem")).toHaveLength(4);
  expect(within(galeria).getByRole("link", { name: "Mew" })).toBeVisible();
  await userEvent.click(within(galeria).getByRole("button", { name: "Fechar galeria" }));
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(within(screen.getByRole("region", { name: "Você recebe" })).getByRole("link", { name: "Rowlet" })).toBeVisible();
  expect(screen.getByRole("link", { name: "Ver troca" })).toHaveAttribute("href", "/trocas?aba=enviadas");
  expect(screen.getByText("Virou troca")).toBeVisible();
  expect(screen.queryByRole("button", { name: "Criar troca" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Cancelar oferta" })).toBeNull();
});

function EstadoDoHistorico() {
  const { state } = useLocation();
  return <output data-testid="estado">{JSON.stringify(state)}</output>;
}

it("mostra o aviso vindo da oferta e tira ele do histórico para não voltar ao recarregar", async () => {
  server.use(
    http.get(url("/offers/me"), () =>
      HttpResponse.json({ success: true, data: { items: [] }, pagination: { page: 1, limit: 20, hasNextPage: false } })
    )
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
  expect(await screen.findByText("Nenhuma proposta enviada")).toBeInTheDocument();
});

function OndeEstou() {
  const { pathname, search } = useLocation();
  return <output data-testid="onde">{`${pathname}${search}`}</output>;
}

function renderizarComTrocas(rota) {
  return renderWithProviders(
    <>
      <Routes>
        <Route path="/propostas" element={<MyOffersPage />} />
        <Route path="/trocas" element={<h1>Página de trocas</h1>} />
      </Routes>
      <OndeEstou />
    </>,
    { rota }
  );
}

it("aceitar explica que a troca nasce, chama a API e leva para a troca", async () => {
  let pedido;
  server.use(
    http.get(url("/offers/me"), () => ofertas([oferta])),
    http.get(url("/trades/me"), () => HttpResponse.json({ success: true, data: { sent: [], received: [] } })),
    http.patch(url("/offers/o1/status"), async ({ request }) => {
      pedido = await request.json();
      return HttpResponse.json({ success: true, data: { offer: { ...oferta, status: "ACCEPTED", tradeId: "t1" } } });
    }),
  );

  renderizarComTrocas("/propostas");
  const cartao = (await screen.findByRole("heading", { name: "De @misty" })).closest("article");
  await userEvent.click(within(cartao).getByRole("button", { name: "Aceitar" }));
  const modal = screen.getByRole("dialog", { name: "Aceitar a oferta de @misty?" });
  expect(within(modal).getByText(/cria a troca na hora e reserva as cartas dos dois lados/)).toBeVisible();
  await userEvent.click(within(modal).getByRole("button", { name: "Aceitar oferta" }));

  expect(await screen.findByRole("heading", { name: "Página de trocas" })).toBeVisible();
  expect(pedido).toEqual({ status: "ACCEPTED" });
  expect(screen.getByTestId("onde")).toHaveTextContent("/trocas?aba=recebidas&status=PROPOSED");
  expect(screen.getByText("Oferta aceita: a troca foi criada e as cartas estão reservadas.")).toBeVisible();
});

it("aceite que falha mostra a mensagem da API e fica na página", async () => {
  server.use(
    http.get(url("/offers/me"), () => ofertas([oferta])),
    http.patch(url("/offers/o1/status"), () =>
      HttpResponse.json({ success: false, error: "As cartas oferecidas não estão mais disponíveis." }, { status: 422 })
    ),
  );

  renderizarComTrocas("/propostas");
  const cartao = (await screen.findByRole("heading", { name: "De @misty" })).closest("article");
  await userEvent.click(within(cartao).getByRole("button", { name: "Aceitar" }));
  await userEvent.click(screen.getByRole("button", { name: "Aceitar oferta" }));

  expect(await within(cartao).findByText("As cartas oferecidas não estão mais disponíveis.")).toBeVisible();
  expect(screen.getByTestId("onde")).toHaveTextContent("/propostas");
});

it("oferta recebida que virou troca mostra Ver troca e não deixa recusar", async () => {
  server.use(http.get(url("/offers/me"), () => ofertas([{ ...oferta, status: "ACCEPTED", tradeId: "t1" }])));

  renderWithProviders(<MyOffersPage />, { rota: "/propostas" });

  const cartao = (await screen.findByRole("heading", { name: "De @misty" })).closest("article");
  expect(within(cartao).getByText("Virou troca")).toBeVisible();
  expect(within(cartao).getByRole("link", { name: "Ver troca" })).toHaveAttribute("href", "/trocas?aba=recebidas");
  expect(within(cartao).queryByRole("button", { name: "Recusar" })).toBeNull();
  expect(within(cartao).queryByRole("button", { name: "Aceitar" })).toBeNull();
});

it("oferta cuja troca já concluiu diz Troca concluída e leva às trocas concluídas", async () => {
  server.use(
    http.get(url("/offers/me"), () => ofertas([{ ...oferta, status: "ACCEPTED", tradeId: "t1", tradeStatus: "ACCEPTED" }])),
  );

  renderWithProviders(<MyOffersPage />, { rota: "/propostas" });

  const cartao = (await screen.findByRole("heading", { name: "De @misty" })).closest("article");
  expect(within(cartao).getByText("Troca concluída")).toBeVisible();
  expect(within(cartao).getByText("Troca concluída: as cartas já mudaram de dono.")).toBeVisible();
  expect(within(cartao).queryByText(/Confirme o recebimento/)).toBeNull();
  expect(within(cartao).getByRole("link", { name: "Ver troca" })).toHaveAttribute("href", "/trocas?aba=recebidas&status=ACCEPTED");
});

it("oferta recebida em espera não deixa aceitar e diz por quê", async () => {
  const emEspera = { ...oferta, onHold: true, listing: { ...oferta.listing, status: "IN_TRADE" } };
  server.use(http.get(url("/offers/me"), () => ofertas([emEspera])));

  renderWithProviders(<MyOffersPage />, { rota: "/propostas" });

  const cartao = (await screen.findByRole("heading", { name: "De @misty" })).closest("article");
  expect(within(cartao).getByRole("button", { name: "Aceitar" })).toBeDisabled();
  expect(within(cartao).getByText("Em espera", { selector: "span" })).toBeVisible();
  expect(within(cartao).getByText("Em espera: este anúncio está em troca com outra pessoa.")).toBeVisible();
});

it("oferta enviada em espera avisa que volta a valer e ainda pode ser cancelada", async () => {
  const emEspera = { ...oferta, onHold: true, listing: { ...oferta.listing, status: "IN_TRADE" } };
  server.use(http.get(url("/offers/me"), () => ofertas([emEspera])));

  renderWithProviders(<MyOffersPage />, { rota: "/propostas?aba=enviadas" });

  const cartao = (await screen.findByRole("heading", { name: "Para @ash" })).closest("article");
  expect(within(cartao).getByText("Em espera: o anúncio está em negociação; se a troca não acontecer, sua oferta volta a valer.")).toBeVisible();
  expect(within(cartao).getByRole("button", { name: "Cancelar oferta" })).toBeEnabled();
});

it("oferta cancelada mostra o motivo", async () => {
  server.use(
    http.get(url("/offers/me"), () => ofertas([{ ...oferta, status: "CANCELED", cancelReason: "LISTING_TRADED" }])),
  );

  renderWithProviders(<MyOffersPage />, { rota: "/propostas?aba=enviadas" });

  const cartao = (await screen.findByRole("heading", { name: "Para @ash" })).closest("article");
  expect(within(cartao).getByText("Cancelada: o anúncio foi trocado com outra pessoa.")).toBeVisible();
  expect(within(cartao).queryByRole("button", { name: "Cancelar oferta" })).toBeNull();
});
