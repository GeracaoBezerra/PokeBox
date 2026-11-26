import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http as rota, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { CONFIG } from "../config";
import { renderWithProviders } from "../test/renderWithProviders";
import { server } from "../test/server";
import WishlistPage from "./wishlist";

const url = (caminho) => `${CONFIG.apiBaseUrl}${caminho}`;
const filtrosDisponiveis = {
  types: ["Fire", "Lightning"],
  rarities: ["Rare", "Rare Holo"],
  sets: [{ id: "base1", name: "Base Set" }],
};
const lista = (items, pagination) =>
  HttpResponse.json({ success: true, data: { items, filters: filtrosDisponiveis }, pagination });

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

const charizard = {
  id: "item-3",
  cardId: "base1-4",
  opportunities: 0,
  card: {
    id: "base1-4",
    name: "Charizard",
    setName: "Base Set",
    number: "4",
    imageUrl: null,
    marketPrice: 987.13,
    marketPriceCurrency: "USD",
    marketPriceSource: "tcgplayer",
  },
};

const resultado = ({ card }) => ({ ...card, set: { name: card.setName } });

function servidor({ pagina = () => lista([pikachu]), inteira = [], colecao = [], aoPedirFiltros = () => {} } = {}) {
  const pedidos = [];
  server.use(
    rota.get(url("/wishlist"), ({ request }) => {
      const params = new URL(request.url).searchParams;
      if (!params.has("page")) return HttpResponse.json({ success: true, data: { items: inteira } });
      expect(params.get("includeFilters")).toBe("false");
      params.delete("includeFilters");
      pedidos.push(Object.fromEntries(params));
      return pagina(params);
    }),
    rota.get(url("/collection"), () => HttpResponse.json({ success: true, data: { items: colecao } })),
    rota.get(url("/wishlist/filters"), () => {
      aoPedirFiltros();
      return HttpResponse.json({ success: true, data: filtrosDisponiveis });
    }),
  );
  return pedidos;
}

function renderizar(caminho = "/procuro") {
  return renderWithProviders(<WishlistPage />, { rota: caminho });
}

async function abrirConfirmacao() {
  await userEvent.click(await screen.findByRole("button", { name: "Remover" }));
  return screen.getByRole("dialog", { name: "Remover Pikachu da wishlist?" });
}

const painelDesktop = () => within(screen.getByRole("complementary", { name: "Filtros da wishlist" }));

describe("Página da wishlist", () => {
  it("mostra o aviso de lista vazia com o card de adicionar", async () => {
    servidor({ pagina: () => lista([]) });

    renderizar();

    expect(await screen.findByText("Sua wishlist está vazia. Adicione uma carta para começar.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Adicionar carta à wishlist" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Limpar filtros" })).not.toBeInTheDocument();
  });

  it("lista os itens com expansão, colecionadores, preço de referência e o link para os anúncios", async () => {
    servidor({ pagina: () => lista([pikachu, mew, charizard]) });

    renderizar();

    expect(await screen.findByText("Base · 58")).toBeInTheDocument();
    expect(screen.getByText("2 colecionadores têm esta carta")).toBeInTheDocument();
    expect(screen.getByText("1 colecionador tem esta carta")).toBeInTheDocument();
    expect(screen.getByText("Ninguém tem ainda")).toBeInTheDocument();
    expect(screen.getByText(/987,13 · referência TCGplayer/)).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Procurar anúncios" })[0]).toHaveAttribute("href", "/marketplace?cardId=base1-58");
    expect(screen.getAllByRole("button", { name: "Remover" })).toHaveLength(3);
    expect(screen.getAllByRole("button", { name: "Já consegui" })).toHaveLength(3);
    expect(screen.queryByText(/Sua wishlist está vazia/)).not.toBeInTheDocument();
  });

  it("pede a primeira página com 23 cartas, ordem por nome e sem filtros", async () => {
    const pedidos = servidor();

    renderizar();

    expect(await screen.findByRole("heading", { name: "Pikachu" })).toBeInTheDocument();
    expect(pedidos).toEqual([{ page: "1", limit: "23" }]);
    expect(screen.getByRole("combobox", { name: "Ordenar por" })).toHaveValue("");
    expect(screen.queryByRole("button", { name: "Próxima" })).not.toBeInTheDocument();
  });

  it("usa os tipos, raridades e expansões da wishlist no painel e aplica a expansão escolhida", async () => {
    const cargas = [];
    const pedidos = servidor({ aoPedirFiltros: () => cargas.push(1) });
    renderizar();

    const painel = painelDesktop();
    const tipos = within(await painel.findByRole("group", { name: "Tipo" }));
    expect(tipos.getByRole("radio", { name: "Fogo" })).toBeInTheDocument();
    expect(tipos.queryByRole("radio", { name: "Água" })).not.toBeInTheDocument();
    expect(painel.getByRole("radio", { name: "Rare Holo" })).toBeInTheDocument();
    expect(painel.queryByRole("radio", { name: "Common" })).not.toBeInTheDocument();

    await userEvent.selectOptions(painel.getByRole("combobox", { name: "Expansão" }), "base1");
    expect(await screen.findByRole("button", { name: "Remover filtro Expansão: Base Set" })).toBeInTheDocument();
    await waitFor(() => expect(pedidos.at(-1)).toMatchObject({ setId: "base1", page: "1" }));
    expect(cargas).toHaveLength(1);
  });

  it("indica expansão indisponível na URL e permite limpar o filtro no painel", async () => {
    const pedidos = servidor();
    renderizar("/procuro?setId=antigo");

    const painel = painelDesktop();
    const limpar = await painel.findByRole("button", { name: "Limpar filtro Expansão" });
    expect(painel.getByRole("option", { name: "antigo (indisponível)" })).toHaveProperty("disabled", true);
    await userEvent.click(limpar);
    await waitFor(() => expect(pedidos.at(-1)).not.toHaveProperty("setId"));
  });

  it("só remove depois de confirmar e atualiza a lista sem recarregar", async () => {
    const removidos = [];
    const pedidos = servidor();
    server.use(
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

    expect(await screen.findByText("Sua wishlist está vazia. Adicione uma carta para começar.")).toBeInTheDocument();
    expect(removidos).toEqual(["item-1"]);
    expect(pedidos).toHaveLength(1);
    expect(screen.getByRole("status")).toHaveTextContent("Pikachu saiu da wishlist.");
  });

  it("se a remoção falha, mostra o erro e a lista continua igual", async () => {
    const pedidos = servidor();
    server.use(
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
    expect(pedidos).toHaveLength(1);
  });

  it("busca no idioma escolhido, identifica duplicatas e adiciona pelo modal sem recarregar", async () => {
    const buscas = [];
    const adicoes = [];
    const pedidos = servidor();
    server.use(
      rota.get(url("/cards"), ({ request }) => {
        const params = new URL(request.url).searchParams;
        buscas.push({ lang: params.get("lang"), termo: params.get("name") });
        return HttpResponse.json({ data: [pikachu, mew].map(resultado) });
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
    expect(pedidos).toHaveLength(1);
  });

  it("atualiza a paginação ao adicionar a vigésima quarta carta", async () => {
    let adicionou = false;
    const itens = Array.from({ length: 23 }, (_, i) => ({
      ...pikachu,
      id: `item-${i}`,
      cardId: `base1-${i}`,
      card: { ...pikachu.card, id: `base1-${i}`, name: `Carta ${i}` },
    }));
    servidor({ pagina: (params) => lista(
      params.get("page") === "2" ? [mew] : itens,
      { hasNextPage: adicionou && params.get("page") === "1" },
    ) });
    server.use(
      rota.get(url("/cards"), () => HttpResponse.json({ data: [resultado(mew)] })),
      rota.post(url("/wishlist"), () => {
        adicionou = true;
        return HttpResponse.json({ data: { item: mew } }, { status: 201 });
      }),
    );
    renderizar();

    await userEvent.click(await screen.findByRole("button", { name: "Adicionar carta à wishlist" }));
    const dialogo = within(screen.getByRole("dialog", { name: "Adicionar à wishlist" }));
    await userEvent.type(dialogo.getByRole("searchbox", { name: "Buscar cartas" }), "mew{Enter}");
    await userEvent.click(await dialogo.findByRole("button", { name: "Adicionar Mew à wishlist" }));

    const proxima = await screen.findByRole("button", { name: "Próxima" });
    expect(screen.getAllByRole("link", { name: "Procurar anúncios" })).toHaveLength(23);
    await userEvent.click(proxima);
    expect(await screen.findByRole("heading", { name: "Mew" })).toBeInTheDocument();
  });

  it("no modal, marca Na wishlist o que está em outra página e Você já tem o que tem unidade na coleção", async () => {
    servidor({
      inteira: [pikachu, mew],
      colecao: [
        { id: "c1", cardId: "base1-4", quantity: 1 },
        { id: "c2", cardId: "base1-2", quantity: 0 },
      ],
    });
    server.use(
      rota.get(url("/cards"), () =>
        HttpResponse.json({
          data: [mew, charizard, { card: { id: "base1-2", name: "Blastoise", setName: "Base Set", number: "2" } }].map(resultado),
        })
      )
    );
    renderizar();

    await userEvent.click(await screen.findByRole("button", { name: "Adicionar carta à wishlist" }));
    const dialogo = within(screen.getByRole("dialog", { name: "Adicionar à wishlist" }));
    await userEvent.type(dialogo.getByRole("searchbox", { name: "Buscar cartas" }), "base{Enter}");

    expect(await dialogo.findByRole("button", { name: "Mew já está na wishlist" })).toBeDisabled();
    const jaTem = await dialogo.findByRole("button", { name: "Você já tem Charizard na coleção" });
    expect(jaTem).toBeDisabled();
    expect(jaTem).toHaveTextContent("Você já tem");
    expect(dialogo.getByRole("button", { name: "Adicionar Blastoise à wishlist" })).toBeEnabled();
  });

  it("Já consegui leva a carta para a coleção e tira da wishlist sem recarregar", async () => {
    const adicoes = [];
    const pedidos = servidor({ pagina: () => lista([pikachu, mew]) });
    server.use(
      rota.get(url("/cards/:id"), ({ params }) => {
        if (params.id === "filters") return undefined;
        return HttpResponse.json({ success: true, data: { card: { ...pikachu.card, id: params.id, variants: { normal: true } } } });
      }),
      rota.post(url("/collection"), async ({ request }) => {
        adicoes.push(await request.json());
        return HttpResponse.json({ success: true, data: { item: { id: "c1" }, removedFromWishlist: true } }, { status: 201 });
      }),
    );
    renderizar();

    const pikachuCard = (await screen.findByRole("heading", { name: "Pikachu" })).closest("article");
    await userEvent.click(within(pikachuCard).getByRole("button", { name: "Já consegui" }));
    const dialogo = within(screen.getByRole("dialog", { name: "Adicionar Pikachu à coleção" }));
    await userEvent.click(await dialogo.findByRole("button", { name: "Adicionar à coleção" }));

    expect(await screen.findByText("Carta adicionada à coleção.")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Pikachu" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Mew" })).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "Adicionar Pikachu à coleção" })).not.toBeInTheDocument();
    expect(adicoes).toEqual([expect.objectContaining({ cardId: "base1-58", quantity: 1, lang: "pt" })]);
    expect(pedidos).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Adicionar carta à wishlist" })).toHaveFocus();
  });

  it("Já consegui em carta que não existe em português usa a versão em inglês", async () => {
    const detalhes = [];
    const adicoes = [];
    servidor();
    server.use(
      rota.get(url("/cards/:id"), ({ request, params }) => {
        if (params.id === "filters") return undefined;
        const lang = new URL(request.url).searchParams.get("lang");
        detalhes.push(lang);
        if (lang === "pt") return HttpResponse.json({ success: false, error: "Carta base1-58 não encontrada" }, { status: 404 });
        return HttpResponse.json({ success: true, data: { card: { ...pikachu.card, variants: { normal: true } } } });
      }),
      rota.post(url("/collection"), async ({ request }) => {
        adicoes.push(await request.json());
        return HttpResponse.json({ success: true, data: { item: { id: "c1" }, removedFromWishlist: true } }, { status: 201 });
      }),
    );
    renderizar();

    await userEvent.click(await screen.findByRole("button", { name: "Já consegui" }));
    const dialogo = within(screen.getByRole("dialog", { name: "Adicionar Pikachu à coleção" }));
    await userEvent.click(await dialogo.findByRole("button", { name: "Adicionar à coleção" }));

    expect(await screen.findByText("Carta adicionada à coleção.")).toBeInTheDocument();
    expect(screen.queryByText("Carta base1-58 não encontrada")).not.toBeInTheDocument();
    expect(detalhes).toEqual(["pt", "en"]);
    expect(adicoes).toEqual([expect.objectContaining({ cardId: "base1-58", lang: "en" })]);
  });

  it("lê filtros, ordem e página da URL, mostra os selos e tira um filtro pelo selo", async () => {
    const pedidos = servidor({ pagina: () => lista([charizard], { page: 2, hasNextPage: false }) });

    renderizar("/procuro?type=Fire&rarity=Rare&sort=recent&page=2");

    expect(await screen.findByRole("heading", { name: "Charizard" })).toBeInTheDocument();
    expect(pedidos[0]).toEqual({ type: "Fire", rarity: "Rare", sort: "recent", page: "2", limit: "23" });
    expect(screen.getByRole("combobox", { name: "Ordenar por" })).toHaveValue("recent");
    expect(screen.getByRole("button", { name: "Remover filtro Raridade: Rare" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Remover filtro Tipo: Fogo" }));

    expect(await screen.findByRole("heading", { name: "Charizard" })).toBeInTheDocument();
    expect(pedidos.at(-1)).toEqual({ rarity: "Rare", sort: "recent", page: "1", limit: "23" });
  });

  it("busca por nome, filtra por tipo e raridade pelo painel e ordena por mais recentes", async () => {
    const pedidos = servidor();
    renderizar();

    await screen.findByRole("heading", { name: "Pikachu" });
    await userEvent.type(painelDesktop().getByRole("searchbox", { name: "Nome da carta" }), "pika{Enter}");
    expect(await screen.findByText("“pika”")).toBeInTheDocument();
    await userEvent.click(painelDesktop().getByRole("radio", { name: "Elétrico" }));
    await userEvent.click(await painelDesktop().findByRole("radio", { name: "Rare" }));
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Ordenar por" }), "recent");

    await screen.findByRole("heading", { name: "Pikachu" });
    expect(pedidos.at(-1)).toEqual({ q: "pika", type: "Lightning", rarity: "Rare", sort: "recent", page: "1", limit: "23" });
  });

  it("busca de uma letra fica na URL, mostra a dica e não vai para a API", async () => {
    const pedidos = servidor();

    renderizar("/procuro?q=a");

    expect(await screen.findByText("Digite pelo menos 2 letras ou números para buscar pelo nome.")).toBeInTheDocument();
    await screen.findByRole("heading", { name: "Pikachu" });
    expect(pedidos).toEqual([{ page: "1", limit: "23" }]);
  });

  it("filtro sem resultado mostra a mensagem própria e Limpar filtros volta para a lista toda", async () => {
    const pedidos = servidor({ pagina: (params) => lista(params.has("type") ? [] : [pikachu]) });

    renderizar("/procuro?type=Water");

    expect(await screen.findByRole("heading", { name: "Nenhuma carta da wishlist bate com esses filtros" })).toBeInTheDocument();
    expect(screen.queryByText(/Sua wishlist está vazia/)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Adicionar carta à wishlist" })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Limpar filtros" }));

    expect(await screen.findByRole("heading", { name: "Pikachu" })).toBeInTheDocument();
    expect(pedidos.at(-1)).toEqual({ page: "1", limit: "23" });
  });

  it("página que não existe, mesmo com filtro, mostra Não há cartas nesta página e volta para a primeira", async () => {
    const pedidos = servidor({
      pagina: (params) => (params.get("page") === "1" ? lista([charizard], { page: 1, hasNextPage: false }) : lista([], { page: 9, hasNextPage: false })),
    });
    renderizar("/procuro?type=Fire&page=9");

    expect(await screen.findByRole("heading", { name: "Não há cartas nesta página" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Nenhuma carta da wishlist bate com esses filtros" })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Voltar para a primeira página" }));

    expect(await screen.findByRole("heading", { name: "Charizard" })).toBeInTheDocument();
    expect(pedidos.at(-1)).toEqual({ type: "Fire", page: "1", limit: "23" });
  });

  it("pagina pela API e mantém o card de adicionar em todas as páginas", async () => {
    const pedidos = servidor({
      pagina: (params) =>
        params.get("page") === "2" ? lista([mew], { page: 2, hasNextPage: false }) : lista([pikachu], { page: 1, hasNextPage: true }),
    });
    renderizar();

    await screen.findByRole("heading", { name: "Pikachu" });
    expect(screen.getByRole("button", { name: "Anterior" })).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "Próxima" }));

    expect(await screen.findByRole("heading", { name: "Mew" })).toBeInTheDocument();
    expect(screen.getByText("Página 2")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Adicionar carta à wishlist" })).toBeInTheDocument();
    expect(pedidos.map((pedido) => pedido.page)).toEqual(["1", "2"]);
  });

  it("ao tirar a última carta de uma página que não é a primeira, volta para a anterior", async () => {
    const pedidos = servidor({
      pagina: (params) =>
        params.get("page") === "2" ? lista([pikachu], { page: 2, hasNextPage: false }) : lista([mew], { page: 1, hasNextPage: false }),
    });
    server.use(rota.delete(url("/wishlist/:id"), () => new HttpResponse(null, { status: 204 })));
    renderizar("/procuro?page=2");

    const dialogo = await abrirConfirmacao();
    await userEvent.click(within(dialogo).getByRole("button", { name: "Remover carta" }));

    expect(await screen.findByRole("heading", { name: "Mew" })).toBeInTheDocument();
    expect(pedidos.map((pedido) => pedido.page)).toEqual(["2", "1"]);
  });

  describe("com mais de uma página, a carta que sobe da página seguinte não some", () => {
    function servidorDe25Cartas() {
      const cartas = Array.from({ length: 25 }, (_, indice) => {
        const numero = String(indice + 1).padStart(2, "0");
        return {
          id: `item-${numero}`,
          cardId: `base1-${numero}`,
          opportunities: 0,
          card: { id: `base1-${numero}`, name: `Carta ${numero}`, setName: "Base", number: numero, imageUrl: null },
        };
      });
      const pedidos = servidor({
        pagina: (params) => {
          const page = Number(params.get("page"));
          const limit = Number(params.get("limit"));
          const inicio = (page - 1) * limit;
          return lista(cartas.slice(inicio, inicio + limit), { page, hasNextPage: inicio + limit < cartas.length });
        },
      });
      const tirar = (cardId) => cartas.splice(cartas.findIndex((carta) => carta.cardId === cardId), 1);
      server.use(
        rota.delete(url("/wishlist/:id"), ({ params }) => {
          tirar(cartas.find((carta) => carta.id === params.id).cardId);
          return new HttpResponse(null, { status: 204 });
        }),
        rota.get(url("/cards/:id"), ({ params }) => {
          if (params.id === "filters") return undefined;
          return HttpResponse.json({ success: true, data: { card: { id: params.id, name: "Carta 01", variants: { normal: true } } } });
        }),
        rota.post(url("/collection"), async ({ request }) => {
          tirar((await request.json()).cardId);
          return HttpResponse.json({ success: true, data: { item: { id: "c1" }, removedFromWishlist: true } }, { status: 201 });
        }),
      );
      return pedidos;
    }

    async function conferirPaginas(pedidos) {
      expect(await screen.findByRole("heading", { name: "Carta 24" })).toBeInTheDocument();
      expect(screen.queryByRole("heading", { name: "Carta 01" })).not.toBeInTheDocument();
      expect(screen.getAllByRole("heading", { level: 2, name: /^Carta \d+$/ })).toHaveLength(23);
      await userEvent.click(screen.getByRole("button", { name: "Próxima" }));
      expect(await screen.findByRole("heading", { name: "Carta 25" })).toBeInTheDocument();
      expect(screen.queryByRole("heading", { name: "Carta 24" })).not.toBeInTheDocument();
      expect(pedidos.map((pedido) => pedido.page)).toEqual(["1", "1", "2"]);
    }

    it("ao remover, a grade fica na tela enquanto a página recarrega e o foco vai para o card de adicionar", async () => {
      servidorDe25Cartas();
      renderizar();

      const carta = (await screen.findByRole("heading", { name: "Carta 01" })).closest("article");
      await userEvent.click(within(carta).getByRole("button", { name: "Remover" }));
      await userEvent.click(within(screen.getByRole("dialog", { name: "Remover Carta 01 da wishlist?" })).getByRole("button", { name: "Remover carta" }));

      expect(screen.getByRole("heading", { name: "Carta 02" })).toBeInTheDocument();
      expect(await screen.findByRole("heading", { name: "Carta 24" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Adicionar carta à wishlist" })).toHaveFocus();
    });

    it("ao remover", async () => {
      const pedidos = servidorDe25Cartas();
      renderizar();

      const carta = (await screen.findByRole("heading", { name: "Carta 01" })).closest("article");
      await userEvent.click(within(carta).getByRole("button", { name: "Remover" }));
      await userEvent.click(within(screen.getByRole("dialog", { name: "Remover Carta 01 da wishlist?" })).getByRole("button", { name: "Remover carta" }));

      await conferirPaginas(pedidos);
    });

    it("ao usar Já consegui", async () => {
      const pedidos = servidorDe25Cartas();
      renderizar();

      const carta = (await screen.findByRole("heading", { name: "Carta 01" })).closest("article");
      await userEvent.click(within(carta).getByRole("button", { name: "Já consegui" }));
      const dialogo = within(screen.getByRole("dialog", { name: "Adicionar Carta 01 à coleção" }));
      await userEvent.click(await dialogo.findByRole("button", { name: "Adicionar à coleção" }));

      await conferirPaginas(pedidos);
    });
  });

  it("com filtro ativo, adicionar pelo modal recarrega a página da lista", async () => {
    const pedidos = servidor({ pagina: () => lista([charizard]) });
    server.use(
      rota.get(url("/cards"), () => HttpResponse.json({ data: [mew].map(resultado) })),
      rota.post(url("/wishlist"), () => HttpResponse.json({ data: { item: mew } }, { status: 201 })),
    );
    renderizar("/procuro?type=Fire");

    await userEvent.click(await screen.findByRole("button", { name: "Adicionar carta à wishlist" }));
    const dialogo = within(screen.getByRole("dialog", { name: "Adicionar à wishlist" }));
    await userEvent.type(dialogo.getByRole("searchbox", { name: "Buscar cartas" }), "mew{Enter}");
    await userEvent.click(await dialogo.findByRole("button", { name: "Adicionar Mew à wishlist" }));

    expect(await screen.findByText("Carta adicionada à wishlist.")).toBeInTheDocument();
    await screen.findByRole("heading", { name: "Charizard" });
    expect(screen.queryByRole("heading", { name: "Mew" })).not.toBeInTheDocument();
    expect(pedidos).toHaveLength(2);
  });

  it("com a API fora do ar mostra o erro e o Tentar de novo carrega a lista", async () => {
    let noAr = false;
    servidor({
      pagina: () => (noAr ? lista([pikachu]) : HttpResponse.json({ success: false, error: "Erro interno" }, { status: 500 })),
    });
    renderizar();

    expect(await screen.findByText("Algo deu errado do nosso lado. Tente de novo em instantes.")).toBeInTheDocument();
    expect(screen.queryByText(/Sua wishlist está vazia/)).not.toBeInTheDocument();

    noAr = true;
    await userEvent.click(screen.getByRole("button", { name: "Tentar de novo" }));

    expect(await screen.findByText("Base · 58")).toBeInTheDocument();
    expect(screen.queryByText("Algo deu errado do nosso lado. Tente de novo em instantes.")).not.toBeInTheDocument();
  });
});
