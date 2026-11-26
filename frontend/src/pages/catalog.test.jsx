import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http as rota, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { CONFIG } from "../config";
import { renderWithProviders } from "../test/renderWithProviders";
import { criarSessaoFalsa } from "../test/sessaoFalsa";
import { server } from "../test/server";
import CatalogPage from "./catalog";

const url = (caminho) => `${CONFIG.apiBaseUrl}${caminho}`;

const charizard = { id: "base1-4", name: "Charizard", number: "4", image: null, set: { id: "base1", name: "Base Set" } };

const opcoes = {
  types: ["Fire", "Water"],
  rarities: ["Rare"],
  categories: ["Pokemon"],
  sets: [{ id: "base1", name: "Base Set" }],
};

function apiDoCatalogo(responder) {
  const pedidos = [];
  server.use(
    rota.get(url("/cards/filters"), () => HttpResponse.json({ success: true, data: opcoes })),
    rota.get(url("/cards"), ({ request }) => {
      const params = new URL(request.url).searchParams;
      pedidos.push(params);
      return HttpResponse.json({ success: true, ...responder(params) });
    })
  );
  return pedidos;
}

function renderizar(endereco, user = null) {
  return renderWithProviders(<CatalogPage />, { rota: endereco, service: criarSessaoFalsa(user) });
}

const pagina = (items, hasNextPage = false) => ({ data: items, pagination: { page: 1, limit: 24, hasNextPage } });

describe("Catálogo: mensagens da busca", () => {
  it("avisa as palavras ignoradas e para quais nome e sets mostrou resultados", async () => {
    apiDoCatalogo(() => ({
      ...pagina([charizard]),
      search: { name: "charizard", sets: ["Base Set", "Base Set 2"], ignored: ["pipi"] },
    }));

    renderizar("/catalogo?name=charizard%20base%20pipi");

    const aviso = await screen.findByText(/Não achamos tudo que você digitou \(pipi\)/);
    expect(aviso).toHaveTextContent("Não achamos tudo que você digitou (pipi). Mostrando resultados para “charizard” em Base Set, Base Set 2.");
    expect(aviso.closest('[role="status"]')).not.toBeNull();
    expect(screen.getByText(/Resultados para/)).toHaveTextContent("Resultados para “charizard base pipi”");
  });

  it("o aviso some quando a nova busca não ignora nada", async () => {
    apiDoCatalogo((params) => ({
      ...pagina([charizard]),
      search:
        params.get("lang") === "en"
          ? { name: "charizard", sets: ["Base Set"], ignored: [] }
          : { name: "charizard", sets: ["Base Set"], ignored: ["pipi"] },
    }));

    renderizar("/catalogo?name=charizard%20base%20pipi");
    await screen.findByText(/Não achamos tudo que você digitou/);

    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Idioma" }), "en");

    expect(await screen.findByText(/Resultados para/)).toHaveTextContent("Resultados para “charizard” em Base Set");
    expect(screen.queryByText(/Não achamos tudo que você digitou/)).not.toBeInTheDocument();
  });

  it("palavra ignorada com lista vazia não mostra o aviso: quem fala é o estado sem resultado", async () => {
    apiDoCatalogo(() => ({ ...pagina([]), search: { name: null, sets: [], ignored: ["charizard"] } }));

    renderizar("/catalogo?name=charizard&type=Water");

    expect(await screen.findByRole("heading", { name: "Nenhuma carta encontrada para “charizard”" })).toBeInTheDocument();
    expect(screen.queryByText(/Não achamos tudo que você digitou/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Limpar busca" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Limpar filtros" })).toBeInTheDocument();
  });

  it("só o nome do set vira Cartas de ...", async () => {
    apiDoCatalogo(() => ({ ...pagina([charizard]), search: { name: null, sets: ["Base Set", "Base Set 2"], ignored: [] } }));

    renderizar("/catalogo?name=base");

    expect(await screen.findByText("Cartas de Base Set, Base Set 2")).toBeInTheDocument();
  });

  it("nome do set com palavra ignorada avisa o que ficou de fora e mostra as cartas do set", async () => {
    apiDoCatalogo(() => ({ ...pagina([charizard]), search: { name: null, sets: ["Base Set"], ignored: ["xyz"] } }));

    renderizar("/catalogo?name=base%20xyz");

    const aviso = await screen.findByText(/Não achamos tudo que você digitou \(xyz\)/);
    expect(aviso).toHaveTextContent("Não achamos tudo que você digitou (xyz). Mostrando as cartas de Base Set.");
    expect(aviso.closest('[role="status"]')).not.toBeNull();
    expect(screen.getByText("Cartas de Base Set")).toBeInTheDocument();
  });

  it("sem resultado: mostra o termo, Limpar busca volta para Todas as cartas e não mostra a paginação", async () => {
    const pedidos = apiDoCatalogo((params) =>
      params.get("name") ? { ...pagina([]), search: { name: null, sets: [], ignored: ["pipipopo"] } } : pagina([charizard])
    );

    renderizar("/catalogo?name=pipipopo");

    expect(await screen.findByRole("heading", { name: "Nenhuma carta encontrada para “pipipopo”" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Anterior" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Próxima" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Limpar filtros" })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Limpar busca" }));

    expect(await screen.findByText("Todas as cartas")).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "Próxima" })).toBeInTheDocument();
    expect(pedidos.at(-1).get("name")).toBeNull();
  });

  it("página vazia além da primeira oferece Voltar para a primeira página", async () => {
    const pedidos = apiDoCatalogo((params) => (params.get("page") === "999" ? pagina([]) : pagina([charizard])));

    renderizar("/catalogo?name=pikachu&page=999");

    await userEvent.click(await screen.findByRole("button", { name: "Voltar para a primeira página" }));

    expect(await screen.findByRole("button", { name: "Próxima" })).toBeInTheDocument();
    expect(pedidos.at(-1).get("page")).toBe("1");
    expect(pedidos.at(-1).get("name")).toBe("pikachu");
  });
});

describe("Catálogo: recarregar sem piscar", () => {
  const blastoise = { ...charizard, id: "base1-2", name: "Blastoise", number: "2" };

  it("ao trocar de página, a lista antiga fica na tela apagada até a nova chegar", async () => {
    let liberar;
    const segunda = new Promise((resolver) => {
      liberar = resolver;
    });
    server.use(
      rota.get(url("/cards/filters"), () => HttpResponse.json({ success: true, data: opcoes })),
      rota.get(url("/cards"), async ({ request }) => {
        const params = new URL(request.url).searchParams;
        if (params.get("page") === "2") {
          await segunda;
          return HttpResponse.json({ success: true, ...pagina([blastoise]) });
        }
        return HttpResponse.json({ success: true, ...pagina([charizard], true) });
      })
    );

    renderizar("/catalogo");
    await userEvent.click(await screen.findByRole("button", { name: "Próxima" }));

    const antiga = screen.getByRole("link", { name: /Charizard/ });
    expect(antiga.closest('[aria-busy="true"]')).not.toBeNull();
    expect(screen.getAllByRole("list").filter((lista) => lista.getAttribute("aria-busy") === "true" && !lista.textContent)).toHaveLength(0);

    liberar();

    expect(await screen.findByRole("link", { name: /Blastoise/ })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Charizard/ })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Blastoise/ }).closest('[aria-busy="true"]')).toBeNull();
  });

  it("se a próxima página falha, avisa o erro e mantém as cartas que já estavam na tela", async () => {
    server.use(
      rota.get(url("/cards/filters"), () => HttpResponse.json({ success: true, data: opcoes })),
      rota.get(url("/cards"), ({ request }) =>
        new URL(request.url).searchParams.get("page") === "2"
          ? HttpResponse.json({ success: false, error: "Erro interno" }, { status: 500 })
          : HttpResponse.json({ success: true, ...pagina([charizard], true) })
      )
    );

    renderizar("/catalogo");
    await userEvent.click(await screen.findByRole("button", { name: "Próxima" }));

    expect(await screen.findByRole("button", { name: "Tentar de novo" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Charizard/ })).toBeInTheDocument();
  });
});

describe("Catálogo: ações da coleção", () => {
  it("mostra cada versão com seus controles e permite iniciar a adição de outra no mesmo modal", async () => {
    apiDoCatalogo(() => pagina([charizard]));
    const versoes = [
      { id: "c1", cardId: charizard.id, card: charizard, finish: "NORMAL", firstEdition: false, condition: "NEAR_MINT", quantity: 2, isPublic: true, deleteBlockedBy: null },
      { id: "c2", cardId: charizard.id, card: charizard, finish: "HOLO", firstEdition: true, condition: "GOOD", quantity: 1, isPublic: false, deleteBlockedBy: null },
    ];
    server.use(
      rota.get(url("/wishlist"), () => HttpResponse.json({ success: true, data: { items: [] } })),
      rota.get(url("/collection"), () => HttpResponse.json({ success: true, data: { items: versoes } })),
      rota.get(url(`/cards/${charizard.id}`), () => HttpResponse.json({ success: true, data: { card: { ...charizard, variants: { normal: true, holo: true, firstEdition: true } } } })),
    );
    renderizar("/catalogo", { username: "ash" });

    await userEvent.click(await screen.findByRole("button", { name: "Editar Charizard" }));
    const dialog = screen.getByRole("dialog", { name: "Editar Charizard" });
    expect(within(dialog).getAllByRole("button", { name: "Salvar alterações" })).toHaveLength(2);
    expect(within(dialog).getAllByRole("button", { name: "Remover versão" })).toHaveLength(2);
    await userEvent.click(within(dialog).getByRole("button", { name: "Adicionar outra versão" }));
    expect(await screen.findByRole("dialog", { name: "Adicionar Charizard à coleção" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Adicionar à coleção" })).toBeInTheDocument();
  });

  it("zera uma versão com histórico de anúncios ao confirmar a retirada", async () => {
    apiDoCatalogo(() => pagina([charizard]));
    const versao = {
      id: "versao-com-historico",
      cardId: charizard.id,
      card: charizard,
      finish: "HOLO",
      firstEdition: false,
      condition: "NEAR_MINT",
      quantity: 1,
      isPublic: true,
      deleteBlockedBy: "LISTING_HISTORY",
    };
    const alteracoes = [];
    server.use(
      rota.get(url("/wishlist"), () => HttpResponse.json({ data: { items: [] } })),
      rota.get(url("/collection"), () => HttpResponse.json({ data: { items: [versao] } })),
      rota.patch(url(`/collection/${versao.id}`), async ({ request }) => {
        alteracoes.push(await request.json());
        versao.quantity = 0;
        return HttpResponse.json({ data: { item: versao } });
      }),
    );
    renderizar("/catalogo", { username: "ash" });

    await userEvent.click(await screen.findByRole("button", { name: "Editar Charizard" }));
    const edicao = screen.getByRole("dialog", { name: "Editar Charizard" });
    await userEvent.click(within(edicao).getByRole("button", { name: "Remover versão" }));
    const confirmacao = await screen.findByRole("dialog", { name: "Tirar carta da coleção?" });
    expect(within(confirmacao).getByText(/histórico de anúncios será mantido/)).toBeInTheDocument();
    await userEvent.click(within(confirmacao).getByRole("button", { name: "Tirar da coleção" }));

    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Editar Charizard" })).not.toBeInTheDocument());
    expect(alteracoes).toEqual([{ quantity: 0 }]);
    const editar = screen.getByRole("button", { name: "Editar Charizard" });
    await waitFor(() => expect(editar).toBeEnabled());
    await userEvent.click(editar);
    const quantidade = within(screen.getByRole("dialog", { name: "Editar Charizard" })).getByRole("spinbutton", { name: "Quantidade" });
    expect(quantidade).toHaveValue(0);
    expect(quantidade).toHaveAttribute("min", "0");
  });

  it("bloqueia outras ações enquanto salva, mesmo se a pessoa fechar o modal", async () => {
    apiDoCatalogo(() => pagina([charizard]));
    const item = {
      id: "versao-em-edicao",
      cardId: charizard.id,
      card: charizard,
      finish: "NORMAL",
      firstEdition: false,
      condition: "NEAR_MINT",
      quantity: 1,
      isPublic: true,
      deleteBlockedBy: null,
    };
    let liberar;
    const espera = new Promise((resolve) => { liberar = resolve; });
    server.use(
      rota.get(url("/wishlist"), () => HttpResponse.json({ data: { items: [] } })),
      rota.get(url("/collection"), () => HttpResponse.json({ data: { items: [item] } })),
      rota.patch(url(`/collection/${item.id}`), async () => {
        await espera;
        item.quantity = 2;
        return HttpResponse.json({ data: { item } });
      }),
    );
    renderizar("/catalogo", { username: "ash" });

    const editar = await screen.findByRole("button", { name: "Editar Charizard" });
    await userEvent.click(editar);
    const modal = within(screen.getByRole("dialog", { name: "Editar Charizard" }));
    const quantidade = modal.getByRole("spinbutton", { name: "Quantidade" });
    await userEvent.clear(quantidade);
    await userEvent.type(quantidade, "2");
    await userEvent.click(modal.getByRole("button", { name: "Salvar alterações" }));
    expect(modal.getByRole("button", { name: "Remover versão" })).toBeDisabled();
    expect(modal.getByRole("button", { name: "Adicionar outra versão" })).toBeDisabled();

    await userEvent.click(modal.getByRole("button", { name: "Fechar" }));
    expect(editar).toBeDisabled();
    liberar();

    expect(await screen.findByText("Item atualizado.")).toBeInTheDocument();
    await waitFor(() => expect(editar).toBeEnabled());
    expect(screen.queryByRole("dialog", { name: "Editar Charizard" })).not.toBeInTheDocument();
  });
});
