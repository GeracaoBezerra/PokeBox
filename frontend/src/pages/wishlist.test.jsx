import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http as rota, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { CONFIG } from "../config";
import { renderWithProviders } from "../test/renderWithProviders";
import { server } from "../test/server";
import WishlistPage from "./wishlist";

const url = (caminho) => `${CONFIG.apiBaseUrl}${caminho}`;
const lista = (items) => HttpResponse.json({ success: true, data: { items } });

const pikachu = {
  id: "item-1",
  cardId: "base1-58",
  opportunities: 2,
  card: { id: "base1-58", name: "Pikachu", setName: "Base", number: "58", imageUrl: null },
};

const mew = {
  id: "item-2",
  cardId: "basep-8",
  opportunities: 1,
  card: { id: "basep-8", name: "Mew", setName: "Wizards Black Star Promos", number: "8", imageUrl: null },
};

function renderizar() {
  return renderWithProviders(<WishlistPage />, { rota: "/procuro" });
}

describe("Página da wishlist", () => {
  it("mostra o aviso de lista vazia", async () => {
    server.use(rota.get(url("/wishlist"), () => lista([])));

    renderizar();

    expect(await screen.findByText("Sua wishlist está vazia.")).toBeInTheDocument();
  });

  it("lista os itens com expansão, número, oportunidades e o link para os anúncios", async () => {
    server.use(rota.get(url("/wishlist"), () => lista([pikachu, mew])));

    renderizar();

    expect(await screen.findByText("Base · 58")).toBeInTheDocument();
    expect(screen.getByText("2 oportunidades")).toBeInTheDocument();
    expect(screen.getByText("1 oportunidade")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Ver anúncios" })[0]).toHaveAttribute("href", "/marketplace?cardId=base1-58");
    expect(screen.getAllByRole("button", { name: "Remover" })).toHaveLength(2);
    expect(screen.queryByText("Sua wishlist está vazia.")).not.toBeInTheDocument();
  });

  it("remove um item, avisa no toast e recarrega a lista", async () => {
    let itens = [pikachu];
    const removidos = [];
    server.use(
      rota.get(url("/wishlist"), () => lista(itens)),
      rota.delete(url("/wishlist/:id"), ({ params }) => {
        removidos.push(params.id);
        itens = [];
        return new HttpResponse(null, { status: 204 });
      })
    );
    renderizar();

    await userEvent.click(await screen.findByRole("button", { name: "Remover" }));

    expect(await screen.findByText("Sua wishlist está vazia.")).toBeInTheDocument();
    expect(removidos).toEqual(["item-1"]);
    expect(screen.getByRole("status")).toHaveTextContent("Pikachu saiu da wishlist.");
  });

  it("se a remoção falha, mostra o erro e a lista continua igual", async () => {
    let cargas = 0;
    server.use(
      rota.get(url("/wishlist"), () => {
        cargas += 1;
        return lista([pikachu]);
      }),
      rota.delete(url("/wishlist/:id"), () =>
        HttpResponse.json({ success: false, error: "Item da wishlist não encontrado" }, { status: 404 })
      )
    );
    renderizar();

    await userEvent.click(await screen.findByRole("button", { name: "Remover" }));

    expect(await screen.findByText("Item da wishlist não encontrado")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remover" })).toBeInTheDocument();
    expect(within(screen.getByRole("status")).queryByText(/saiu da wishlist/)).not.toBeInTheDocument();
    expect(cargas).toBe(1);
  });

  it("com a API fora do ar mostra o erro e o Tentar de novo carrega a lista", async () => {
    let noAr = false;
    server.use(
      rota.get(url("/wishlist"), () =>
        noAr ? lista([pikachu]) : HttpResponse.json({ success: false, error: "Erro interno" }, { status: 500 })
      )
    );
    renderizar();

    expect(await screen.findByText("Algo deu errado do nosso lado. Tente de novo em instantes.")).toBeInTheDocument();
    expect(screen.queryByText("Sua wishlist está vazia.")).not.toBeInTheDocument();

    noAr = true;
    await userEvent.click(screen.getByRole("button", { name: "Tentar de novo" }));

    expect(await screen.findByText("Base · 58")).toBeInTheDocument();
    expect(screen.queryByText("Algo deu errado do nosso lado. Tente de novo em instantes.")).not.toBeInTheDocument();
  });
});
