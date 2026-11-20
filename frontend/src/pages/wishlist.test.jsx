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

async function abrirConfirmacao() {
  await userEvent.click(await screen.findByRole("button", { name: "Remover" }));
  return screen.getByRole("dialog", { name: "Remover Pikachu da wishlist?" });
}

describe("Página da wishlist", () => {
  it("mostra o aviso de lista vazia", async () => {
    server.use(rota.get(url("/wishlist"), () => lista([])));

    renderizar();

    expect(await screen.findByText("Sua wishlist está vazia.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Adicionar carta à wishlist" })).toBeInTheDocument();
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

  it("só remove depois de confirmar e atualiza a lista sem recarregar", async () => {
    let cargas = 0;
    const removidos = [];
    server.use(
      rota.get(url("/wishlist"), () => {
        cargas += 1;
        return lista([pikachu]);
      }),
      rota.delete(url("/wishlist/:id"), ({ params }) => {
        removidos.push(params.id);
        return new HttpResponse(null, { status: 204 });
      })
    );
    renderizar();

    const confirmacao = await abrirConfirmacao();
    await userEvent.click(within(confirmacao).getByRole("button", { name: "Cancelar" }));
    expect(removidos).toEqual([]);
    expect(screen.getByRole("heading", { name: "Pikachu" })).toBeInTheDocument();

    const dialogo = await abrirConfirmacao();
    await userEvent.click(within(dialogo).getByRole("button", { name: "Remover carta" }));

    expect(await screen.findByText("Sua wishlist está vazia.")).toBeInTheDocument();
    expect(removidos).toEqual(["item-1"]);
    expect(cargas).toBe(1);
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

    const dialogo = await abrirConfirmacao();
    await userEvent.click(within(dialogo).getByRole("button", { name: "Remover carta" }));

    expect(await screen.findByText("Item da wishlist não encontrado")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remover" })).toBeInTheDocument();
    expect(within(screen.getByRole("status")).queryByText(/saiu da wishlist/)).not.toBeInTheDocument();
    expect(cargas).toBe(1);
  });

  it("busca no idioma escolhido, identifica duplicatas e adiciona pelo modal sem recarregar", async () => {
    let cargas = 0;
    const buscas = [];
    const adicoes = [];
    server.use(
      rota.get(url("/wishlist"), () => {
        cargas += 1;
        return lista([pikachu]);
      }),
      rota.get(url("/cards"), ({ request }) => {
        const params = new URL(request.url).searchParams;
        buscas.push({ lang: params.get("lang"), termo: params.get("name") });
        return HttpResponse.json({ data: [pikachu, mew].map(({ card }) => ({ ...card, set: { name: card.setName } })) });
      }),
      rota.post(url("/wishlist"), async ({ request }) => {
        adicoes.push(await request.json());
        return HttpResponse.json({ data: { item: mew } }, { status: 201 });
      }),
    );
    renderizar();

    const abrir = await screen.findByRole("button", { name: "Adicionar carta à wishlist" });
    await userEvent.click(abrir);
    const dialogo = within(screen.getByRole("dialog", { name: "Adicionar à wishlist" }));
    const busca = dialogo.getByRole("searchbox", { name: "Buscar cartas" });
    expect(busca).toHaveFocus();
    expect(buscas).toEqual([]);
    await userEvent.selectOptions(dialogo.getByRole("combobox", { name: "Idioma das cartas" }), "en");
    await userEvent.type(busca, "mew{Enter}");
    expect(await dialogo.findByRole("button", { name: "Pikachu já está na wishlist" })).toBeDisabled();
    await userEvent.click(dialogo.getByRole("button", { name: "Adicionar Mew à wishlist" }));

    expect(await screen.findByRole("heading", { name: "Mew" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Pikachu" })).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "Adicionar à wishlist" })).not.toBeInTheDocument();
    expect(screen.getByText("Carta adicionada à wishlist.")).toBeInTheDocument();
    expect(abrir).toHaveFocus();
    expect(buscas).toEqual([{ lang: "en", termo: "mew" }]);
    expect(adicoes).toEqual([{ cardId: "basep-8", lang: "en" }]);
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
