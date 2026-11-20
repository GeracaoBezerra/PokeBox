import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { useLocation } from "react-router-dom";
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
    http.get(url("/offers/me"), () => ofertas([{ ...oferta, items: itens, status: "ACCEPTED", hasTrade: true }])),
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
  expect(screen.getByRole("link", { name: "Ver troca" })).toHaveAttribute("href", "/trocas");
  expect(screen.queryByRole("button", { name: "Criar troca" })).toBeNull();
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
