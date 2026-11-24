import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http as rota, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { CONFIG } from "../config";
import { renderWithProviders } from "../test/renderWithProviders";
import { server } from "../test/server";
import MyCollectionPage from "./myCollection";

const url = (caminho) => `${CONFIG.apiBaseUrl}${caminho}`;
const lista = (items, pagination = { page: 1, limit: 24, hasNextPage: false }) =>
  HttpResponse.json({ success: true, data: { items }, pagination });

function item(id, nome, extra = {}) {
  return {
    id,
    cardId: `base1-${id}`,
    quantity: 2,
    reservedQuantity: 0,
    available: 2,
    condition: "NEAR_MINT",
    finish: "NORMAL",
    firstEdition: false,
    isPublic: true,
    deleteBlockedBy: null,
    card: { id: `base1-${id}`, name: nome, setName: "Base", number: id, imageUrl: null },
    ...extra,
  };
}

const pikachu = item("58", "Pikachu");

function servidor({ pagina = () => lista([pikachu]), resumo = { totalUnits: 2, distinctCards: 1, listedItems: 0 } } = {}) {
  const pedidos = [];
  const resumos = [];
  server.use(
    rota.get(url("/collection"), ({ request }) => {
      const params = new URL(request.url).searchParams;
      pedidos.push(Object.fromEntries(params));
      return pagina(params, pedidos.length);
    }),
    rota.get(url("/collection/summary"), () => {
      resumos.push(1);
      return HttpResponse.json({ success: true, data: typeof resumo === "function" ? resumo(resumos.length) : resumo });
    }),
  );
  return { pedidos, resumos };
}

function renderizar(caminho = "/colecao") {
  return renderWithProviders(<MyCollectionPage />, { rota: caminho });
}

const cartao = async (nome) => (await screen.findByRole("heading", { name: nome })).closest("article");
const painelDesktop = () => within(screen.getByRole("complementary", { name: "Filtros da coleção" }));

describe("Página Minha coleção", () => {
  it("mostra os totais da coleção inteira com singular e plural", async () => {
    servidor({ resumo: { totalUnits: 1, distinctCards: 1, listedItems: 0 } });

    renderizar();

    expect(await screen.findByText("1 carta · 1 diferente · 0 anunciadas")).toBeInTheDocument();
  });

  it("totais no plural", async () => {
    servidor({ resumo: { totalUnits: 25, distinctCards: 12, listedItems: 1 } });

    renderizar();

    expect(await screen.findByText("25 cartas · 12 diferentes · 1 anunciada")).toBeInTheDocument();
  });

  it("pede a primeira página sem os zerados e mostra a grade por padrão", async () => {
    const { pedidos } = servidor();

    renderizar();

    const card = await cartao("Pikachu");
    expect(within(card).getByText("Normal · Near Mint")).toBeInTheDocument();
    expect(pedidos).toEqual([{ withZero: "false", page: "1", limit: "24" }]);
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Grade" })).toHaveAttribute("aria-pressed", "true");
  });

  it("lê filtros, ordem e página da URL, mostra os selos e tira um filtro pelo selo", async () => {
    const { pedidos } = servidor({ pagina: () => lista([pikachu], { page: 2, limit: 24, hasNextPage: false }) });

    renderizar("/colecao?q=pika&type=Lightning&condition=MINT&finish=HOLO&isPublic=false&sort=recent&page=2");

    await cartao("Pikachu");
    expect(pedidos[0]).toEqual({
      q: "pika",
      type: "Lightning",
      condition: "MINT",
      finish: "HOLO",
      isPublic: "false",
      sort: "recent",
      withZero: "false",
      page: "2",
      limit: "24",
    });
    expect(screen.getByRole("combobox", { name: "Ordenar por" })).toHaveValue("recent");
    expect(screen.getByRole("button", { name: "Remover filtro Só privadas" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remover filtro Acabamento: Holo" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Remover filtro Condição: Mint" }));

    await screen.findByRole("heading", { name: "Pikachu" });
    expect(pedidos.at(-1)).toEqual({
      q: "pika",
      type: "Lightning",
      finish: "HOLO",
      isPublic: "false",
      sort: "recent",
      withZero: "false",
      page: "1",
      limit: "24",
    });
  });

  it("filtra pelo painel, mostra os zerados e ordena por adicionadas recentemente", async () => {
    const { pedidos } = servidor();
    renderizar();

    await cartao("Pikachu");
    await userEvent.type(painelDesktop().getByRole("searchbox", { name: "Nome da carta" }), "pika{Enter}");
    expect(await screen.findByText("“pika”")).toBeInTheDocument();
    await userEvent.click(painelDesktop().getByRole("radio", { name: "Só públicas" }));
    await userEvent.click(painelDesktop().getByRole("checkbox", { name: "Mostrar zerados" }));
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Ordenar por" }), "recent");

    await screen.findByRole("heading", { name: "Pikachu" });
    expect(pedidos.at(-1)).toEqual({ q: "pika", isPublic: "true", sort: "recent", page: "1", limit: "24" });
    expect(screen.getByRole("button", { name: "Remover filtro Mostrando zerados" })).toBeInTheDocument();
  });

  it("pagina pela API", async () => {
    const { pedidos } = servidor({
      pagina: (params) =>
        params.get("page") === "2"
          ? lista([item("4", "Charizard")], { page: 2, limit: 24, hasNextPage: false })
          : lista([pikachu], { page: 1, limit: 24, hasNextPage: true }),
    });
    renderizar();

    await cartao("Pikachu");
    await userEvent.click(screen.getByRole("button", { name: "Próxima" }));

    expect(await screen.findByRole("heading", { name: "Charizard" })).toBeInTheDocument();
    expect(pedidos.at(-1)).toMatchObject({ page: "2", limit: "24" });
    expect(screen.getByRole("button", { name: "Próxima" })).toBeDisabled();
  });

  it("troca entre grade e lista sem pedir a coleção de novo", async () => {
    const { pedidos } = servidor();
    renderizar();

    await cartao("Pikachu");
    await userEvent.click(screen.getByRole("button", { name: "Lista" }));

    const tabela = screen.getByRole("table", { name: "Cartas da sua coleção" });
    expect(within(tabela).getByRole("columnheader", { name: "Ações" })).toBeInTheDocument();
    expect(within(tabela).getByRole("combobox", { name: "Condição de Pikachu" })).toHaveValue("NEAR_MINT");
    expect(within(tabela).getByRole("spinbutton", { name: "Quantidade de Pikachu" })).toHaveAttribute("min", "1");
    expect(screen.getByRole("button", { name: "Lista" })).toHaveAttribute("aria-pressed", "true");
    expect(pedidos).toHaveLength(1);

    await userEvent.click(screen.getByRole("button", { name: "Grade" }));
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("na lista, a linha acompanha os dados novos depois de recarregar", async () => {
    servidor({
      pagina: (_params, vez) => lista([vez === 1 ? pikachu : { ...pikachu, quantity: 7, available: 7 }]),
    });
    server.use(rota.patch(url("/collection/:id"), () => HttpResponse.json({ success: true, data: { item: pikachu } })));
    renderizar("/colecao?visao=lista");

    const linha = (await screen.findByRole("link", { name: "Pikachu" })).closest("tr");
    await userEvent.click(within(linha).getByRole("checkbox", { name: "Pikachu pública" }));
    await userEvent.click(within(linha).getByRole("button", { name: "Salvar" }));

    expect(await screen.findByDisplayValue("7")).toBeInTheDocument();
    const nova = screen.getByRole("link", { name: "Pikachu" }).closest("tr");
    expect(within(nova).getByRole("checkbox", { name: "Pikachu pública" })).toBeChecked();
    expect(within(nova).getByRole("button", { name: "Salvar" })).toBeDisabled();
  });

  it("na lista, quantidade 0 não deixa salvar", async () => {
    servidor();
    renderizar("/colecao?visao=lista");

    const campo = await screen.findByRole("spinbutton", { name: "Quantidade de Pikachu" });
    await userEvent.clear(campo);
    await userEvent.type(campo, "0");

    expect(campo).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("button", { name: "Salvar" })).toBeDisabled();
  });

  it("adiciona carta pelo modal e avisa que somou e que saiu da wishlist", async () => {
    const adicoes = [];
    const { pedidos, resumos } = servidor();
    server.use(
      rota.get(url("/cards"), () =>
        HttpResponse.json({ data: [{ id: "base1-58", name: "Pikachu", number: "58", set: { name: "Base" } }] }),
      ),
      rota.get(url("/cards/:id"), ({ params }) =>
        HttpResponse.json({
          success: true,
          data: { card: { id: params.id, name: "Pikachu", variants: { normal: true, firstEdition: false } } },
        }),
      ),
      rota.post(url("/collection"), async ({ request }) => {
        adicoes.push(await request.json());
        return HttpResponse.json(
          { success: true, data: { item: { ...pikachu, quantity: 3 }, removedFromWishlist: true } },
          { status: 201 },
        );
      }),
    );
    renderizar();

    await cartao("Pikachu");
    await userEvent.click(screen.getByRole("button", { name: "Adicionar carta" }));
    const dialogo = within(screen.getByRole("dialog", { name: "Adicionar carta" }));
    await userEvent.type(dialogo.getByRole("searchbox", { name: "Buscar cartas" }), "pika{Enter}");
    await userEvent.click(await dialogo.findByRole("button", { name: "Escolher Pikachu" }));
    expect(await dialogo.findByRole("checkbox", { name: /1ª edição/ })).toBeDisabled();
    await userEvent.click(dialogo.getByRole("button", { name: "Adicionar à coleção" }));

    expect(
      await screen.findByText("Somamos 1 ao Pikachu que você já tinha. Pikachu saiu da sua wishlist."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "Adicionar carta" })).not.toBeInTheDocument();
    expect(adicoes).toEqual([expect.objectContaining({ cardId: "base1-58", quantity: 1, finish: "NORMAL" })]);
    await waitFor(() => expect(pedidos).toHaveLength(2));
    await waitFor(() => expect(resumos).toHaveLength(2));
  });

  it("carta nova sem wishlist avisa que entrou na coleção", async () => {
    const { pedidos } = servidor();
    server.use(
      rota.get(url("/cards"), () => HttpResponse.json({ data: [{ id: "base1-4", name: "Charizard", set: { name: "Base" } }] })),
      rota.get(url("/cards/:id"), () =>
        HttpResponse.json({ success: true, data: { card: { id: "base1-4", name: "Charizard", variants: { holo: true } } } }),
      ),
      rota.post(url("/collection"), () =>
        HttpResponse.json(
          { success: true, data: { item: item("4", "Charizard", { quantity: 1 }), removedFromWishlist: false } },
          { status: 201 },
        ),
      ),
    );
    renderizar();

    await cartao("Pikachu");
    await userEvent.click(screen.getByRole("button", { name: "Adicionar carta" }));
    const dialogo = within(screen.getByRole("dialog", { name: "Adicionar carta" }));
    await userEvent.type(dialogo.getByRole("searchbox", { name: "Buscar cartas" }), "char{Enter}");
    await userEvent.click(await dialogo.findByRole("button", { name: "Escolher Charizard" }));
    await userEvent.click(await dialogo.findByRole("button", { name: "Adicionar à coleção" }));

    expect(await screen.findByText("Charizard entrou na sua coleção.")).toBeInTheDocument();
    await waitFor(() => expect(pedidos).toHaveLength(2));
  });

  it("edita pelo modal com quantidade mínima 1", async () => {
    const mudancas = [];
    const { pedidos } = servidor();
    server.use(
      rota.patch(url("/collection/:id"), async ({ request, params }) => {
        mudancas.push({ id: params.id, ...(await request.json()) });
        return HttpResponse.json({ success: true, data: { item: pikachu } });
      }),
    );
    renderizar();

    await userEvent.click(within(await cartao("Pikachu")).getByRole("button", { name: "Editar Pikachu" }));
    const dialogo = within(screen.getByRole("dialog", { name: "Editar item" }));
    const quantidade = dialogo.getByRole("spinbutton", { name: "Quantidade" });
    await userEvent.clear(quantidade);
    await userEvent.type(quantidade, "0");

    expect(dialogo.getByText("A quantidade mínima é 1.")).toBeInTheDocument();
    expect(dialogo.getByRole("button", { name: "Salvar" })).toBeDisabled();

    await userEvent.clear(quantidade);
    await userEvent.type(quantidade, "5");
    await userEvent.selectOptions(dialogo.getByRole("combobox", { name: "Condição" }), "MINT");
    await userEvent.click(dialogo.getByRole("button", { name: "Salvar" }));

    expect(await screen.findByText("Item atualizado.")).toBeInTheDocument();
    expect(mudancas).toEqual([{ id: "58", quantity: 5, condition: "MINT" }]);
    expect(screen.queryByRole("dialog", { name: "Editar item" })).not.toBeInTheDocument();
    await waitFor(() => expect(pedidos).toHaveLength(2));
  });

  it("explica por que não dá para apagar cada item", async () => {
    servidor({
      pagina: () =>
        lista([
          item("1", "Reservada", { reservedQuantity: 1, available: 1, deleteBlockedBy: "RESERVED" }),
          item("2", "Anunciada", { deleteBlockedBy: "OPEN_LISTING" }),
          item("3", "Ofertada", { deleteBlockedBy: "OPEN_OFFER" }),
        ]),
    });
    renderizar();

    const reservada = within(await cartao("Reservada"));
    expect(reservada.getByRole("button", { name: "Apagar" })).toBeDisabled();
    expect(reservada.getByRole("button", { name: "Apagar" })).toHaveAccessibleDescription("Está numa troca em andamento");

    const anunciada = within(await cartao("Anunciada"));
    expect(anunciada.getByRole("button", { name: "Apagar" })).toBeDisabled();
    expect(anunciada.getByText(/Tem anúncio aberto/)).toBeInTheDocument();
    expect(anunciada.getByRole("link", { name: "Ver anúncios" })).toHaveAttribute("href", "/anuncios");

    const ofertada = within(await cartao("Ofertada"));
    expect(ofertada.getByRole("button", { name: "Apagar" })).toBeDisabled();
    expect(ofertada.getByText("Está numa oferta aberta")).toBeInTheDocument();
  });

  it("apaga item livre depois de confirmar", async () => {
    const removidos = [];
    const { resumos } = servidor({ pagina: (_params, vez) => lista(vez === 1 ? [pikachu] : []) });
    server.use(
      rota.delete(url("/collection/:id"), ({ params }) => {
        removidos.push(params.id);
        return new HttpResponse(null, { status: 204 });
      }),
    );
    renderizar();

    await userEvent.click(within(await cartao("Pikachu")).getByRole("button", { name: "Apagar" }));
    const confirmacao = screen.getByRole("dialog", { name: "Apagar carta da coleção?" });
    await userEvent.click(within(confirmacao).getByRole("button", { name: "Apagar" }));

    expect(await screen.findByText("Pikachu saiu da sua coleção.")).toBeInTheDocument();
    expect(removidos).toEqual(["58"]);
    expect(await screen.findByRole("heading", { name: "Sua coleção está vazia" })).toBeInTheDocument();
    await waitFor(() => expect(resumos).toHaveLength(2));
  });

  it("item já anunciado não apaga: Tirar da coleção zera a quantidade depois de confirmar", async () => {
    const mudancas = [];
    const { pedidos } = servidor({ pagina: () => lista([item("7", "Furret", { deleteBlockedBy: "LISTING_HISTORY" })]) });
    server.use(
      rota.patch(url("/collection/:id"), async ({ request }) => {
        mudancas.push(await request.json());
        return HttpResponse.json({ success: true, data: { item: pikachu } });
      }),
    );
    renderizar();

    const furret = within(await cartao("Furret"));
    expect(furret.queryByRole("button", { name: "Apagar" })).not.toBeInTheDocument();
    await userEvent.click(furret.getByRole("button", { name: "Tirar da coleção" }));
    const confirmacao = screen.getByRole("dialog", { name: "Tirar Furret da coleção?" });
    expect(confirmacao).toHaveTextContent(/histórico/);
    await userEvent.click(within(confirmacao).getByRole("button", { name: "Tirar da coleção" }));

    expect(await screen.findByText("Furret saiu da sua coleção.")).toBeInTheDocument();
    expect(mudancas).toEqual([{ quantity: 0 }]);
    await waitFor(() => expect(pedidos).toHaveLength(2));
  });

  it("anuncia pelo modal", async () => {
    const anuncios = [];
    const { pedidos } = servidor();
    server.use(
      rota.post(url("/listings"), async ({ request }) => {
        anuncios.push(await request.json());
        return HttpResponse.json({ success: true, data: { listing: { id: "l1" } } }, { status: 201 });
      }),
    );
    renderizar();

    await userEvent.click(within(await cartao("Pikachu")).getByRole("button", { name: "Anunciar" }));
    const dialogo = within(screen.getByRole("dialog", { name: "Anunciar esta carta" }));
    expect(dialogo.getByText(/2 disponíveis/)).toBeInTheDocument();
    await userEvent.click(dialogo.getByRole("button", { name: "Criar anúncio" }));

    expect(await screen.findByText("Anúncio criado. Veja em Meus anúncios.")).toBeInTheDocument();
    expect(anuncios).toEqual([{ collectionItemId: "58", quantity: 1 }]);
    expect(screen.queryByRole("dialog", { name: "Anunciar esta carta" })).not.toBeInTheDocument();
    await waitFor(() => expect(pedidos).toHaveLength(2));
  });

  it("coleção vazia chama para adicionar a primeira carta", async () => {
    servidor({ pagina: () => lista([]), resumo: { totalUnits: 0, distinctCards: 0, listedItems: 0 } });
    renderizar();

    expect(await screen.findByRole("heading", { name: "Sua coleção está vazia" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Adicionar sua primeira carta" }));

    expect(screen.getByRole("dialog", { name: "Adicionar carta" })).toBeInTheDocument();
  });

  it("filtro sem resultado mostra a mensagem e Limpar filtros volta para a coleção toda", async () => {
    const { pedidos } = servidor({ pagina: (params) => lista(params.has("type") ? [] : [pikachu]) });
    renderizar("/colecao?type=Fire");

    expect(await screen.findByRole("heading", { name: "Nenhuma carta da coleção bate com esses filtros" })).toBeInTheDocument();
    await userEvent.click(screen.getAllByRole("button", { name: "Limpar filtros" })[0]);

    expect(await screen.findByRole("heading", { name: "Pikachu" })).toBeInTheDocument();
    expect(pedidos.at(-1)).toEqual({ withZero: "false", page: "1", limit: "24" });
  });
});
