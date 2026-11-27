import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { Link, MemoryRouter, useLocation } from "react-router-dom";
import { describe, expect, it } from "vitest";
import BuscaGeral from "./BuscaGeral";
import { CONFIG } from "../../config";
import { server } from "../../test/server";

function Endereco() {
  const { pathname, search } = useLocation();
  return <output aria-label="endereço">{pathname + search}</output>;
}

function renderizar(inicio) {
  return render(
    <MemoryRouter initialEntries={[inicio]}>
      <BuscaGeral />
      <Link to="/catalogo">Cartas</Link>
      <Endereco />
    </MemoryRouter>
  );
}

const esperar = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

describe("BuscaGeral", () => {
  it("Enter com username exato mantém a lista até a pessoa escolher o perfil", async () => {
    const pessoa = userEvent.setup();
    server.use(http.get(`${CONFIG.apiBaseUrl}/users`, () => HttpResponse.json({
      data: { items: [{ name: "Ash Ketchum", username: "ash" }] },
      pagination: { hasNextPage: false },
    })));
    renderizar("/");
    await pessoa.type(screen.getByRole("searchbox"), "@ash{Enter}");
    const perfil = await screen.findByRole("link", { name: "Ash Ketchum @ash" });
    expect(screen.getByLabelText("endereço")).toHaveTextContent(/^\/$/);
    await pessoa.tab();
    expect(perfil).toHaveFocus();
    await pessoa.keyboard("{Enter}");
    expect(screen.getByLabelText("endereço")).toHaveTextContent("/u/ash");
  });

  it("pesquisa por @ sem sair do marketplace e abre só o perfil escolhido, inclusive na segunda página", async () => {
    const pessoa = userEvent.setup();
    const pedidos = [];
    server.use(http.get(`${CONFIG.apiBaseUrl}/users`, ({ request }) => {
      const params = Object.fromEntries(new URL(request.url).searchParams);
      pedidos.push(params);
      const primeira = params.page === "1";
      return HttpResponse.json({
        data: { items: primeira ? [{ name: "José Lima", username: "zelima" }] : [{ name: "José Silva", username: "silva" }] },
        pagination: { hasNextPage: primeira },
      });
    }));
    renderizar("/marketplace?q=eevee");
    const campo = screen.getByRole("searchbox");
    await pessoa.clear(campo);
    await pessoa.type(campo, "@josé{Enter}");
    expect(await screen.findByRole("link", { name: "José Lima @zelima" })).toHaveAttribute("href", "/u/zelima");
    expect(screen.getByLabelText("endereço")).toHaveTextContent("/marketplace?q=eevee");
    await pessoa.click(screen.getByRole("button", { name: "Carregar mais colecionadores" }));
    const link = await screen.findByRole("link", { name: "José Silva @silva" });
    expect(pedidos).toEqual([{ q: "josé", page: "1", limit: "5" }, { q: "josé", page: "2", limit: "5" }]);
    await pessoa.tab();
    expect(link).toHaveFocus();
    await pessoa.keyboard("{Enter}");
    expect(screen.getByLabelText("endereço")).toHaveTextContent("/u/silva");
  });

  it("descarta a resposta anterior quando a pessoa muda o termo", async () => {
    const pessoa = userEvent.setup();
    let liberar, sinalizar, sinalAnterior;
    const aguardando = new Promise((resolve) => { liberar = resolve; });
    const iniciou = new Promise((resolve) => { sinalizar = resolve; });
    server.use(http.get(`${CONFIG.apiBaseUrl}/users`, async ({ request }) => {
      const q = new URL(request.url).searchParams.get("q");
      if (q === "as") {
        sinalAnterior = request.signal;
        sinalizar();
        await aguardando;
      }
      return HttpResponse.json({ data: { items: [{ name: q, username: q }] }, pagination: { hasNextPage: false } });
    }));
    renderizar("/catalogo");
    const campo = screen.getByRole("searchbox");
    await pessoa.type(campo, "@as");
    await iniciou;
    await pessoa.type(campo, "h");
    await waitFor(() => expect(sinalAnterior.aborted).toBe(true));
    expect(await screen.findByRole("link", { name: "ash @ash" })).toBeVisible();
    await act(async () => { liberar(); await esperar(20); });
    expect(screen.queryByRole("link", { name: "as @as" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "ash @ash" })).toBeVisible();
  });

  it("recupera a segunda página sem perder resultados nem repetir um perfil deslocado entre páginas", async () => {
    const pessoa = userEvent.setup();
    const pedidos = [];
    const ana = { name: "Ana", username: "ana" };
    const bia = { name: "Bia", username: "bia" };
    server.use(http.get(`${CONFIG.apiBaseUrl}/users`, ({ request }) => {
      const pagina = new URL(request.url).searchParams.get("page");
      pedidos.push(pagina);
      if (pedidos.length === 2) return HttpResponse.error();
      return HttpResponse.json({
        data: { items: pagina === "1" ? [ana] : [ana, bia] },
        pagination: { hasNextPage: pagina === "1" },
      });
    }));
    renderizar("/");
    await pessoa.type(screen.getByRole("searchbox"), "@a");
    await pessoa.click(await screen.findByRole("button", { name: "Carregar mais colecionadores" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/servidor/i);
    expect(screen.getByRole("link", { name: "Ana @ana" })).toBeVisible();
    await pessoa.click(screen.getByRole("button", { name: "Tentar de novo" }));
    expect(await screen.findByRole("link", { name: "Bia @bia" })).toBeVisible();
    expect(screen.getAllByRole("link", { name: "Ana @ana" })).toHaveLength(1);
    expect(pedidos).toEqual(["1", "2", "2"]);
  });

  it.each([
    [400, /revise o texto/i, false],
    [404, /indisponível no servidor/i, true],
    [200, /tente de novo/i, true],
  ])("distingue resposta inválida ou HTTP %i de uma busca sem resultados", async (status, mensagem, podeRepetir) => {
    const pessoa = userEvent.setup();
    server.use(http.get(`${CONFIG.apiBaseUrl}/users`, () => HttpResponse.json({ data: {} }, { status })));
    renderizar("/");
    await pessoa.type(screen.getByRole("searchbox"), "@ash");
    expect(await screen.findByRole("alert")).toHaveTextContent(mensagem);
    expect(Boolean(screen.queryByRole("button", { name: "Tentar de novo" }))).toBe(podeRepetir);
    expect(screen.queryByText("Nenhum colecionador encontrado.")).not.toBeInTheDocument();
  });

  it("aceita colar @ e os 50 caracteres do termo no campo vazio", async () => {
    const pessoa = userEvent.setup();
    const termos = [];
    server.use(http.get(`${CONFIG.apiBaseUrl}/users`, ({ request }) => {
      termos.push(new URL(request.url).searchParams.get("q"));
      return HttpResponse.json({ data: { items: [] }, pagination: { hasNextPage: false } });
    }));
    renderizar("/");
    await pessoa.click(screen.getByRole("searchbox"));
    const termo = "a".repeat(50);
    await pessoa.paste("@" + termo);
    expect(await screen.findByText("Nenhum colecionador encontrado.")).toBeVisible();
    expect(termos).toEqual([termo]);
  });

  it("orienta com @ sozinho, permite repetir uma falha e fechar a lista com Escape", async () => {
    const pessoa = userEvent.setup();
    let pedidos = 0;
    server.use(http.get(`${CONFIG.apiBaseUrl}/users`, () => {
      pedidos++;
      return pedidos === 1 ? new HttpResponse(null, { status: 503 }) :
        HttpResponse.json({ data: { items: [] }, pagination: { hasNextPage: false } });
    }));
    renderizar("/");
    const campo = screen.getByRole("searchbox");
    await pessoa.type(campo, "@{Enter}");
    expect(screen.getByText("Digite um nome ou usuário depois do @.")).toBeVisible();
    expect(pedidos).toBe(0);
    await pessoa.type(campo, "n");
    await pessoa.click(await screen.findByRole("button", { name: "Tentar de novo" }));
    expect(await screen.findByText("Nenhum colecionador encontrado.")).toBeVisible();
    await pessoa.click(campo);
    await pessoa.keyboard("{Escape}");
    expect(screen.queryByText("Nenhum colecionador encontrado.")).not.toBeInTheDocument();
    expect(campo).toHaveFocus();
  });

  it("descarta o rascunho ao trocar de página, mesmo com o termo da URL igual, e não busca sozinha na página nova", async () => {
    const pessoa = userEvent.setup();
    renderizar("/");

    await pessoa.type(screen.getByRole("searchbox", { name: "Buscar cartas" }), "pikachu");
    await pessoa.click(screen.getByRole("link", { name: "Cartas" }));

    expect(screen.getByRole("searchbox", { name: "Buscar cartas" })).toHaveValue("");
    await esperar(500);
    expect(screen.getByLabelText("endereço")).toHaveTextContent(/^\/catalogo$/);
  });

  it("na página de resultados, busca sozinha depois de parar de digitar", async () => {
    const pessoa = userEvent.setup();
    renderizar("/catalogo");

    await pessoa.type(screen.getByRole("searchbox", { name: "Buscar cartas" }), "pikachu");
    await esperar(500);

    expect(screen.getByLabelText("endereço")).toHaveTextContent("/catalogo?name=pikachu");
    expect(screen.getByRole("searchbox", { name: "Buscar cartas" })).toHaveValue("pikachu");
  });
});
