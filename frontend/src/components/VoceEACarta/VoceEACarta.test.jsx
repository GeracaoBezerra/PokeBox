import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http as rota, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";
import { CONFIG } from "../../config";
import { renderWithProviders } from "../../test/renderWithProviders";
import { server } from "../../test/server";
import VoceEACarta from "./VoceEACarta";

const url = (caminho) => `${CONFIG.apiBaseUrl}${caminho}`;

const card = { id: "sv03.5-025", name: "Pikachu" };
const normal = { id: "item-normal", cardId: card.id, finish: "NORMAL", firstEdition: false, condition: "NEAR_MINT", quantity: 1, available: 1 };
const reverse = { id: "item-reverse", cardId: card.id, finish: "REVERSE", firstEdition: false, condition: "MINT", quantity: 3, available: 2 };
const outraCarta = { id: "item-outra", cardId: "base1-4", finish: "HOLO", firstEdition: true, condition: "MINT", quantity: 1, available: 1 };
const reservado = { ...normal, id: "item-reservado", available: 0 };

const semAnuncio = { inCollection: 4, inWishlist: false, onTradeList: false, myListing: null };
const comAnuncioAtivo = { inCollection: 4, inWishlist: false, onTradeList: true, myListing: { id: "anuncio-ash", status: "ACTIVE" } };
const comAnuncioPausado = { inCollection: 4, inWishlist: false, onTradeList: false, myListing: { id: "anuncio-pausado", status: "PAUSED" } };

function renderizar({ user = semAnuncio, onMudou = vi.fn() } = {}) {
  renderWithProviders(<VoceEACarta card={card} lang="en" user={user} onMudou={onMudou} />, {
    rota: `/cards/${card.id}`,
  });
  return onMudou;
}

function colecao(itens) {
  server.use(rota.get(url("/collection"), () => HttpResponse.json({ success: true, data: { items: itens } })));
}

async function abrirModal(pessoa) {
  await pessoa.click(screen.getByRole("button", { name: "Anunciar esta carta" }));
  return screen.findByRole("dialog", { name: "Anunciar esta carta" });
}

describe("VoceEACarta: atalho para anunciar", () => {
  it("com uma cópia livre, mostra a variante e cria o anúncio dessa cópia", async () => {
    const pessoa = userEvent.setup();
    const enviados = [];
    colecao([normal, outraCarta]);
    server.use(
      rota.post(url("/listings"), async ({ request }) => {
        enviados.push(await request.json());
        return HttpResponse.json({ success: true, data: { listing: { id: "anuncio-1" } } }, { status: 201 });
      })
    );
    const onMudou = renderizar();

    const modal = await abrirModal(pessoa);
    expect(await within(modal).findByText("Normal · Near Mint")).toBeInTheDocument();
    expect(within(modal).queryByLabelText("Qual cópia?")).not.toBeInTheDocument();

    await pessoa.click(within(modal).getByRole("button", { name: "Criar anúncio" }));

    await waitFor(() => expect(onMudou).toHaveBeenCalledTimes(1));
    expect(enviados).toEqual([{ collectionItemId: "item-normal", quantity: 1 }]);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Anúncio criado.");
  });

  it("com várias cópias livres, pergunta qual e anuncia a escolhida", async () => {
    const pessoa = userEvent.setup();
    const enviados = [];
    colecao([normal, reverse, reservado]);
    server.use(
      rota.post(url("/listings"), async ({ request }) => {
        enviados.push(await request.json());
        return HttpResponse.json({ success: true, data: { listing: { id: "anuncio-2" } } }, { status: 201 });
      })
    );
    renderizar();

    const modal = await abrirModal(pessoa);
    const qual = await within(modal).findByLabelText("Qual cópia?");
    expect(within(qual).getAllByRole("option").map((opcao) => opcao.textContent)).toEqual([
      "Normal · Near Mint · 1 livre",
      "Reverse · Mint · 2 livres",
    ]);

    await pessoa.selectOptions(qual, "item-reverse");
    const quantidade = within(modal).getByLabelText("Quantidade para troca");
    expect(quantidade).toHaveAttribute("max", "2");
    await pessoa.clear(quantidade);
    await pessoa.type(quantidade, "2");
    await pessoa.click(within(modal).getByRole("button", { name: "Criar anúncio" }));

    await waitFor(() => expect(enviados).toEqual([{ collectionItemId: "item-reverse", quantity: 2 }]));
  });

  it("se a API recusa, mostra o erro no modal e ele continua aberto", async () => {
    const pessoa = userEvent.setup();
    colecao([normal]);
    server.use(
      rota.post(url("/listings"), () =>
        HttpResponse.json(
          { success: false, error: "Quantidade acima do que você tem: 1 unidade(s) disponível(is), 1 já anunciada(s) em outros anúncios" },
          { status: 422 }
        )
      )
    );
    const onMudou = renderizar();

    const modal = await abrirModal(pessoa);
    await pessoa.click(await within(modal).findByRole("button", { name: "Criar anúncio" }));

    expect(await within(modal).findByRole("alert")).toHaveTextContent("Quantidade acima do que você tem");
    expect(screen.getByRole("dialog", { name: "Anunciar esta carta" })).toBeInTheDocument();
    expect(onMudou).not.toHaveBeenCalled();
  });

  it("sem cópia livre, avisa que todas estão reservadas em trocas", async () => {
    const pessoa = userEvent.setup();
    colecao([reservado]);
    renderizar();

    const modal = await abrirModal(pessoa);

    expect(await within(modal).findByText("Todas as suas cópias desta carta estão reservadas em trocas.")).toBeInTheDocument();
    expect(within(modal).queryByRole("button", { name: "Criar anúncio" })).not.toBeInTheDocument();
  });

  it("Esc e Fechar fecham o modal sem criar nada", async () => {
    const pessoa = userEvent.setup();
    colecao([normal]);
    const onMudou = renderizar();

    await abrirModal(pessoa);
    await screen.findByText("Normal · Near Mint");
    await pessoa.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    const modal = await abrirModal(pessoa);
    await pessoa.click(within(modal).getByRole("button", { name: "Fechar" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(onMudou).not.toHaveBeenCalled();
  });

  it("com anúncio ativo, mostra Ver meu anúncio apontando para o próprio anúncio", () => {
    renderizar({ user: comAnuncioAtivo });

    expect(screen.getByText("Você tem um anúncio ativo desta carta.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver meu anúncio" })).toHaveAttribute("href", "/marketplace/anuncio-ash");
    expect(screen.queryByRole("button", { name: "Anunciar esta carta" })).not.toBeInTheDocument();
  });

  it("com anúncio pausado, também mostra Ver meu anúncio em vez de Anunciar esta carta", () => {
    renderizar({ user: comAnuncioPausado });

    expect(screen.getByText("Você tem um anúncio pausado desta carta.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver meu anúncio" })).toHaveAttribute("href", "/marketplace/anuncio-pausado");
    expect(screen.queryByRole("button", { name: "Anunciar esta carta" })).not.toBeInTheDocument();
  });

  it("com anúncio em troca, avisa e mostra Ver meu anúncio", () => {
    renderizar({ user: { ...comAnuncioPausado, myListing: { id: "anuncio-em-troca", status: "IN_TRADE" } } });

    expect(screen.getByText("Você tem um anúncio em troca desta carta.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver meu anúncio" })).toHaveAttribute("href", "/marketplace/anuncio-em-troca");
    expect(screen.queryByRole("button", { name: "Anunciar esta carta" })).not.toBeInTheDocument();
  });

  it("sem anúncio e com a carta, mostra Anunciar esta carta e nenhum aviso de anúncio", () => {
    renderizar({ user: semAnuncio });

    expect(screen.getByRole("button", { name: "Anunciar esta carta" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Ver meu anúncio" })).not.toBeInTheDocument();
    expect(screen.queryByText(/Você tem um anúncio/)).not.toBeInTheDocument();
  });

  it("quem não tem a carta não vê nenhum dos dois atalhos", () => {
    renderizar({ user: { inCollection: 0, inWishlist: false, onTradeList: false, myListing: null } });

    expect(screen.queryByRole("button", { name: "Anunciar esta carta" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Ver meu anúncio" })).not.toBeInTheDocument();
  });
});
