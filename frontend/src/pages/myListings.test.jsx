import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http as rota, HttpResponse } from "msw";
import { useLocation } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { CONFIG } from "../config";
import { renderWithProviders } from "../test/renderWithProviders";
import { server } from "../test/server";
import MyListingsPage from "./myListings";

const url = (caminho) => `${CONFIG.apiBaseUrl}${caminho}`;

function anuncio(id, nome, extra = {}) {
  return {
    id,
    quantity: 2,
    description: `${nome} em bom estado`,
    status: "ACTIVE",
    createdAt: "2026-11-20T10:00:00.000Z",
    updatedAt: "2026-11-20T10:00:00.000Z",
    owner: { username: "misty", name: "Misty" },
    item: { id: `item-${id}`, condition: "NEAR_MINT", finish: "NORMAL", firstEdition: false },
    card: { id: `base1-${id}`, name: nome, imageUrl: null },
    ...extra,
  };
}

function itemColecao(id, nome, extra = {}) {
  return {
    id,
    cardId: `sv1-${id}`,
    quantity: 3,
    reservedQuantity: 0,
    available: 3,
    condition: "NEAR_MINT",
    finish: "HOLO",
    firstEdition: false,
    isPublic: true,
    card: { id: `sv1-${id}`, name: nome, imageUrl: null },
    ...extra,
  };
}

const PADRAO = [
  anuncio("a1", "Starmie"),
  anuncio("a2", "Venusaur", { status: "IN_TRADE", quantity: 0 }),
  anuncio("a3", "Psyduck", { status: "PAUSED" }),
  anuncio("a4", "Gyarados", { status: "CLOSED" }),
  anuncio("a5", "Mewtwo", { status: "BLOCKED" }),
];

function servidor({ anuncios = PADRAO, colecao = [], aoCriar, aoEditar } = {}) {
  const pedidos = { lista: 0, criados: [], editados: [] };
  let atuais = anuncios;
  server.use(
    rota.get(url("/listings/me"), () => {
      pedidos.lista += 1;
      return HttpResponse.json({ success: true, data: { items: atuais } });
    }),
    rota.get(url("/collection"), () => HttpResponse.json({ success: true, data: { items: colecao } })),
    rota.post(url("/listings"), async ({ request }) => {
      const corpo = await request.json();
      pedidos.criados.push(corpo);
      if (aoCriar) atuais = aoCriar(atuais, corpo);
      return HttpResponse.json({ success: true, data: { listing: { id: "novo" } } }, { status: 201 });
    }),
    rota.patch(url("/listings/:id"), async ({ request, params }) => {
      const corpo = await request.json();
      pedidos.editados.push({ id: params.id, ...corpo });
      if (aoEditar) atuais = aoEditar(atuais, params.id, corpo);
      return HttpResponse.json({ success: true, data: { listing: { id: params.id, ...corpo } } });
    }),
  );
  return pedidos;
}

function OndeEstou() {
  const { search } = useLocation();
  return <output data-testid="onde">{search}</output>;
}

function renderizar(caminho = "/anuncios") {
  return renderWithProviders(
    <>
      <MyListingsPage />
      <OndeEstou />
    </>,
    { rota: caminho },
  );
}

const cartao = async (nome) => (await screen.findByRole("heading", { name: nome })).closest("article");

describe("Página Meus anúncios", () => {
  it("separa os anúncios em abas com contagem e começa em Ativos, com o em troca junto", async () => {
    servidor();

    renderizar();

    expect(await screen.findByRole("tab", { name: "Ativos (2)" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Pausados (1)" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Encerrados (2)" })).toBeInTheDocument();
    expect(await cartao("Starmie")).toBeInTheDocument();
    expect(within(await cartao("Venusaur")).getByText("Em troca")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Psyduck" })).not.toBeInTheDocument();
    expect(screen.getByRole("tabpanel", { name: "Ativos (2)" })).toBeInTheDocument();
  });

  it("guarda a aba na URL e abre direto nela", async () => {
    servidor();

    renderizar("/anuncios?status=encerrados");

    expect(await screen.findByRole("tab", { name: "Encerrados (2)" })).toHaveAttribute("aria-selected", "true");
    expect(await cartao("Gyarados")).toBeInTheDocument();
    expect(await cartao("Mewtwo")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("tab", { name: "Pausados (1)" }));

    expect(screen.getByTestId("onde")).toHaveTextContent("?status=pausados");
    expect(await cartao("Psyduck")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Gyarados" })).not.toBeInTheDocument();
  });

  it("aba desconhecida na URL cai em Ativos", async () => {
    servidor();

    renderizar("/anuncios?status=qualquer");

    expect(await screen.findByRole("tab", { name: "Ativos (2)" })).toHaveAttribute("aria-selected", "true");
  });

  it("mostra o card com variante, condição, data, quantidade e descrição com rótulos", async () => {
    servidor();

    renderizar();

    const card = within(await cartao("Starmie"));
    expect(card.getByRole("link", { name: "Starmie" })).toHaveAttribute("href", "/marketplace/a1");
    expect(card.getByText("Normal · Near Mint")).toBeInTheDocument();
    expect(card.getByText("Ativo")).toBeInTheDocument();
    expect(card.getByText(`Criado em ${new Date("2026-11-20T10:00:00.000Z").toLocaleDateString("pt-BR")}`)).toBeInTheDocument();
    expect(card.getByRole("spinbutton", { name: "Quantidade do anúncio de Starmie" })).toHaveValue(2);
    expect(card.getByRole("textbox", { name: "Descrição do anúncio de Starmie" })).toHaveValue("Starmie em bom estado");
    expect(card.getByRole("button", { name: "Salvar" })).toBeDisabled();
  });

  it("anúncio em troca só mostra quantidade e descrição, com Pausar e Fechar", async () => {
    servidor();

    renderizar();

    const card = within(await cartao("Venusaur"));
    expect(card.queryByRole("spinbutton")).not.toBeInTheDocument();
    expect(card.queryByRole("textbox")).not.toBeInTheDocument();
    expect(card.queryByRole("button", { name: "Salvar" })).not.toBeInTheDocument();
    expect(card.getByText("Venusaur em bom estado")).toBeInTheDocument();
    expect(card.getByRole("button", { name: "Pausar" })).toBeEnabled();
    expect(card.getByRole("button", { name: "Fechar" })).toBeEnabled();
  });

  it("anúncio bloqueado mostra o selo da moderação e que volta como pausado", async () => {
    servidor();

    renderizar("/anuncios?status=encerrados");

    const card = within(await cartao("Mewtwo"));
    expect(card.getByText("Bloqueado pela moderação")).toBeInTheDocument();
    expect(card.getByText(/Se a moderação desbloquear, ele volta como pausado/)).toBeInTheDocument();
    expect(card.queryByRole("button")).not.toBeInTheDocument();
    expect(card.queryByRole("spinbutton")).not.toBeInTheDocument();
  });

  it("anúncio fechado é só leitura", async () => {
    servidor();

    renderizar("/anuncios?status=encerrados");

    const card = within(await cartao("Gyarados"));
    expect(card.getByText("Fechado")).toBeInTheDocument();
    expect(card.queryByRole("button")).not.toBeInTheDocument();
    expect(card.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("pausado sem unidades pede a quantidade antes de reativar", async () => {
    servidor({ anuncios: [anuncio("p0", "Bulbasaur", { status: "PAUSED", quantity: 0 })] });

    renderizar("/anuncios?status=pausados");

    const card = within(await cartao("Bulbasaur"));
    expect(card.getByText(/Informe a quantidade e salve para poder reativar/)).toBeInTheDocument();
    expect(card.getByRole("button", { name: "Ativar" })).toBeDisabled();
    expect(card.getByRole("spinbutton", { name: "Quantidade do anúncio de Bulbasaur" })).toHaveAccessibleDescription("A quantidade mínima é 1.");
  });

  it("aumentar a quantidade salva sem pedir confirmação", async () => {
    const pedidos = servidor();

    renderizar();

    const card = within(await cartao("Starmie"));
    const quantidade = card.getByRole("spinbutton", { name: "Quantidade do anúncio de Starmie" });
    await userEvent.clear(quantidade);
    await userEvent.type(quantidade, "3");
    await userEvent.click(card.getByRole("button", { name: "Salvar" }));

    await waitFor(() => expect(pedidos.editados).toEqual([{ id: "a1", quantity: 3 }]));
    expect(screen.queryByRole("dialog", { name: "Diminuir a quantidade?" })).not.toBeInTheDocument();
  });

  it("diminuir a quantidade pede confirmação avisando das ofertas em espera", async () => {
    const pedidos = servidor();

    renderizar();

    const card = within(await cartao("Starmie"));
    const quantidade = card.getByRole("spinbutton", { name: "Quantidade do anúncio de Starmie" });
    await userEvent.clear(quantidade);
    await userEvent.type(quantidade, "1");
    await userEvent.click(card.getByRole("button", { name: "Salvar" }));

    const confirmacao = within(await screen.findByRole("dialog", { name: "Diminuir a quantidade?" }));
    expect(confirmacao.getByText(/pedem mais de 1 unidade ficam em espera/)).toBeInTheDocument();
    await userEvent.click(confirmacao.getByRole("button", { name: "Cancelar" }));
    expect(pedidos.editados).toEqual([]);

    await userEvent.click(card.getByRole("button", { name: "Salvar" }));
    await userEvent.click(within(await screen.findByRole("dialog", { name: "Diminuir a quantidade?" })).getByRole("button", { name: "Diminuir" }));

    await waitFor(() => expect(pedidos.editados).toEqual([{ id: "a1", quantity: 1 }]));
  });

  it("o card mostra os dados novos depois de recarregar e o erro da ação fica no próprio card", async () => {
    const pedidos = servidor({
      aoEditar: (atuais, id, corpo) => atuais.map((a) => (a.id === id ? { ...a, ...corpo, updatedAt: "2026-11-21T00:00:00.000Z" } : a)),
    });

    renderizar();

    const card = within(await cartao("Starmie"));
    const descricao = card.getByRole("textbox", { name: "Descrição do anúncio de Starmie" });
    await userEvent.clear(descricao);
    await userEvent.type(descricao, "Nova descrição");
    await userEvent.click(card.getByRole("button", { name: "Salvar" }));

    await waitFor(() => expect(pedidos.lista).toBe(2));
    await waitFor(() => expect(within(screen.getByRole("heading", { name: "Starmie" }).closest("article")).getByRole("button", { name: "Salvar" })).toBeDisabled());
    const atualizado = within(await cartao("Starmie"));
    expect(atualizado.getByRole("textbox", { name: "Descrição do anúncio de Starmie" })).toHaveValue("Nova descrição");

    server.use(
      rota.patch(url("/listings/a1"), () =>
        HttpResponse.json({ success: false, error: "Quantidade acima do que você tem" }, { status: 422 }),
      ),
    );
    const quantidade = atualizado.getByRole("spinbutton", { name: "Quantidade do anúncio de Starmie" });
    await userEvent.clear(quantidade);
    await userEvent.type(quantidade, "9");
    await userEvent.click(atualizado.getByRole("button", { name: "Salvar" }));

    expect(await atualizado.findByRole("alert")).toHaveTextContent("Quantidade acima do que você tem");
    expect(within(await cartao("Venusaur")).queryByRole("alert")).not.toBeInTheDocument();
  });

  it("quando o anúncio muda por fora, o campo mostra o valor novo depois de recarregar", async () => {
    servidor({
      aoEditar: (atuais) => atuais.map((a) => (a.id === "a1" ? { ...a, quantity: 1, updatedAt: "2026-11-22T00:00:00.000Z" } : a)),
    });

    renderizar();

    expect(within(await cartao("Starmie")).getByRole("spinbutton", { name: "Quantidade do anúncio de Starmie" })).toHaveValue(2);
    await userEvent.click(within(await cartao("Venusaur")).getByRole("button", { name: "Pausar" }));

    await waitFor(() =>
      expect(within(screen.getByRole("heading", { name: "Starmie" }).closest("article")).getByRole("spinbutton", { name: "Quantidade do anúncio de Starmie" })).toHaveValue(1),
    );
  });

  it("cada aba vazia tem a sua mensagem e Ativos oferece o Novo anúncio", async () => {
    servidor({ anuncios: [] });

    renderizar();

    const vazio = await screen.findByRole("heading", { name: "Nenhum anúncio ativo" });
    expect(within(vazio.parentElement).getByRole("button", { name: "Novo anúncio" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Ativos (0)" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("tab", { name: "Pausados (0)" }));
    expect(await screen.findByRole("heading", { name: "Nenhum anúncio pausado" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("tab", { name: "Encerrados (0)" }));
    expect(await screen.findByRole("heading", { name: "Nenhum anúncio encerrado" })).toBeInTheDocument();
  });

  it("Novo anúncio sem carta disponível manda para a coleção", async () => {
    servidor({
      colecao: [itemColecao("c1", "Pikachu", { available: 0, reservedQuantity: 3 })],
    });

    renderizar();

    await userEvent.click(screen.getAllByRole("button", { name: "Novo anúncio" })[0]);

    const dialogo = within(screen.getByRole("dialog", { name: "Novo anúncio" }));
    expect(await dialogo.findByRole("heading", { name: "Você não tem cartas disponíveis para anunciar" })).toBeInTheDocument();
    expect(dialogo.getByRole("link", { name: "Ir para a coleção" })).toHaveAttribute("href", "/colecao");
  });

  it("Novo anúncio só lista o que está livre, busca pelo nome e cria na aba Ativos", async () => {
    const pedidos = servidor({
      anuncios: [anuncio("a3", "Psyduck", { status: "PAUSED", item: { id: "c3", condition: "NEAR_MINT", finish: "NORMAL", firstEdition: false } })],
      colecao: [
        itemColecao("c1", "Ultra Ball", { finish: "NORMAL", available: 3 }),
        itemColecao("c2", "Pokébola", { available: 0 }),
        itemColecao("c3", "Psyduck", { available: 2 }),
        itemColecao("c4", "Ultra Ball", { condition: "PLAYED", finish: "REVERSE_HOLO", available: 1 }),
        itemColecao("c5", "Eevee", { available: 1 }),
      ],
      aoCriar: (atuais, corpo) => [...atuais, anuncio("novo", "Ultra Ball", { quantity: corpo.quantity, item: { id: corpo.collectionItemId, condition: "NEAR_MINT", finish: "NORMAL", firstEdition: false } })],
    });

    renderizar("/anuncios?status=pausados");

    await screen.findByRole("tab", { name: "Pausados (1)" });
    await userEvent.click(screen.getByRole("button", { name: "Novo anúncio" }));
    const dialogo = within(screen.getByRole("dialog", { name: "Novo anúncio" }));
    const lista = within(await dialogo.findByRole("list", { name: "Cartas da sua coleção" }));
    expect(lista.getAllByRole("listitem")).toHaveLength(3);
    expect(lista.queryByText("Pokébola")).not.toBeInTheDocument();
    expect(lista.queryByText("Psyduck")).not.toBeInTheDocument();

    await userEvent.type(dialogo.getByRole("searchbox", { name: "Buscar na sua coleção" }), "ultra");
    expect(lista.getAllByRole("listitem")).toHaveLength(2);
    expect(lista.queryByText("Eevee")).not.toBeInTheDocument();

    await userEvent.click(lista.getByRole("button", { name: "Escolher Ultra Ball (Normal · Near Mint)" }));
    expect(dialogo.getByText(/3 disponíveis/)).toBeInTheDocument();
    const quantidade = dialogo.getByRole("spinbutton", { name: "Quantidade para troca" });
    expect(quantidade).toHaveAttribute("max", "3");
    await userEvent.clear(quantidade);
    await userEvent.type(quantidade, "2");
    await userEvent.type(dialogo.getByRole("textbox", { name: "Descrição (opcional)" }), "Para trocar");
    await userEvent.click(dialogo.getByRole("button", { name: "Criar anúncio" }));

    await waitFor(() => expect(pedidos.criados).toEqual([{ collectionItemId: "c1", quantity: 2, description: "Para trocar" }]));
    expect(await screen.findByText("Anúncio criado.")).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Novo anúncio" })).not.toBeInTheDocument());
    expect(screen.getByTestId("onde")).toHaveTextContent("?status=ativos");
    expect(await cartao("Ultra Ball")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Ativos (1)" })).toHaveAttribute("aria-selected", "true");
  });

  it("Trocar carta volta para a lista no Novo anúncio", async () => {
    servidor({ anuncios: [], colecao: [itemColecao("c5", "Eevee", { available: 1 })] });

    renderizar();

    await screen.findByRole("heading", { name: "Nenhum anúncio ativo" });
    await userEvent.click(screen.getAllByRole("button", { name: "Novo anúncio" })[1]);
    const dialogo = within(screen.getByRole("dialog", { name: "Novo anúncio" }));
    await userEvent.click(await dialogo.findByRole("button", { name: /Escolher Eevee/ }));
    await userEvent.click(dialogo.getByRole("button", { name: "Trocar carta" }));

    expect(await dialogo.findByRole("searchbox", { name: "Buscar na sua coleção" })).toBeInTheDocument();
  });
});
