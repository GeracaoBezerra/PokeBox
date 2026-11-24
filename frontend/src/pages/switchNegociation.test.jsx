import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { expect, it } from "vitest";
import { CONFIG } from "../config";
import { renderWithProviders } from "../test/renderWithProviders";
import { server } from "../test/server";
import SwitchNegociationPage from "./switchNegociation";

const url = (caminho) => `${CONFIG.apiBaseUrl}${caminho}`;
const troca = {
  id: "t1",
  status: "PROPOSED",
  createdAt: "2026-11-20T12:00:00Z",
  completedAt: null,
  proposerConfirmedAt: null,
  recipientConfirmedAt: null,
  proposer: { username: "misty" },
  recipient: { username: "ash" },
  items: [
    { card: { id: "sm1-9", name: "Rowlet" }, quantity: 1, condition: "MINT", finish: "NORMAL", from: "ash", to: "misty" },
    { card: { id: "base1-53", name: "Psyduck" }, quantity: 1, condition: "MINT", finish: "NORMAL", from: "misty", to: "ash" },
  ],
};

function trocas(items, hasNextPage = false) {
  return HttpResponse.json({ data: { items }, pagination: { hasNextPage } });
}

it("lista as trocas em cartões e mantém a paginação", async () => {
  server.use(http.get(url("/trades/me"), () => trocas([troca], true)));
  renderWithProviders(<SwitchNegociationPage />, { rota: "/trocas" });

  const lista = await screen.findByRole("list", { name: "Lista de trocas" });
  expect(within(lista).getByRole("heading", { name: "Troca com @misty" })).toBeVisible();
  expect(screen.getByRole("button", { name: /Próxima/ })).toBeEnabled();
});

it("sem trocas, mostra o estado vazio com o atalho para as propostas", async () => {
  server.use(http.get(url("/trades/me"), () => trocas([])));
  renderWithProviders(<SwitchNegociationPage />, { rota: "/trocas?aba=enviadas" });

  expect(await screen.findByRole("heading", { name: "Nenhuma troca enviada" })).toBeVisible();
  expect(screen.getByRole("link", { name: "Ver propostas enviadas" })).toHaveAttribute("href", "/propostas?aba=enviadas");
});

it("sem trocas no status escolhido, oferece ver todos os status", async () => {
  server.use(http.get(url("/trades/me"), () => trocas([])));
  renderWithProviders(<SwitchNegociationPage />, { rota: "/trocas?status=CANCELED" });

  expect(await screen.findByRole("heading", { name: "Nenhuma troca com este status" })).toBeVisible();
  expect(screen.getByRole("button", { name: "Ver todos os status" })).toBeVisible();
});

it("se a busca falha, avisa e deixa tentar de novo", async () => {
  let falhar = true;
  server.use(
    http.get(url("/trades/me"), () =>
      falhar ? HttpResponse.json({ success: false, error: "Erro" }, { status: 500 }) : trocas([troca])
    )
  );
  renderWithProviders(<SwitchNegociationPage />, { rota: "/trocas" });

  const tentar = await screen.findByRole("button", { name: "Tentar de novo" });
  expect(screen.queryByRole("list", { name: "Lista de trocas" })).toBeNull();
  falhar = false;
  await userEvent.click(tentar);
  expect(await screen.findByRole("heading", { name: "Troca com @misty" })).toBeVisible();
});
