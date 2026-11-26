import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http as rota, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { CONFIG } from "../../config";
import { renderWithProviders } from "../../test/renderWithProviders";
import { server } from "../../test/server";
import FormColecao from "./FormColecao";

const url = (caminho) => `${CONFIG.apiBaseUrl}${caminho}`;
const carta = { id: "base1-4", name: "Charizard" };

function responderAdicao(requisicoes) {
  server.use(
    rota.post(url("/collection"), async ({ request }) => {
      requisicoes.push(await request.json());
      return HttpResponse.json({ success: true, data: { item: { id: "item-1" }, removedFromWishlist: false } }, { status: 201 });
    })
  );
}

describe("FormColecao: acabamento e edição", () => {
  it("mostra acabamento único como texto e envia esse acabamento ao adicionar", async () => {
    const requisicoes = [];
    responderAdicao(requisicoes);
    renderWithProviders(<FormColecao card={{ ...carta, variants: { holo: true } }} lang="pt" onAdicionado={() => {}} />);

    expect(screen.queryByRole("combobox", { name: "Acabamento" })).not.toBeInTheDocument();
    expect(screen.getByText("Holo")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Adicionar à coleção" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Carta adicionada à coleção.");
    expect(requisicoes[0]).toMatchObject({ cardId: carta.id, finish: "HOLO" });
  });

  it("mantém o select para múltiplos acabamentos e mostra 1ª edição quando disponível", () => {
    renderWithProviders(<FormColecao card={{ ...carta, variants: { normal: true, holo: true, firstEdition: true } }} lang="pt" onAdicionado={() => {}} />);

    expect(screen.getByRole("combobox", { name: "Acabamento" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Normal" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Holo" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "1ª edição" })).toBeEnabled();
  });

  it.each([{}, { normal: false, holo: false, reverse: false, firstEdition: false }])(
    "sem informação de variantes mantém os três acabamentos e permite cadastrar 1ª edição (%j)",
    async (variants) => {
      const requisicoes = [];
      responderAdicao(requisicoes);
      renderWithProviders(<FormColecao card={{ ...carta, variants }} lang="pt" onAdicionado={() => {}} />);

      const acabamento = screen.getByRole("combobox", { name: "Acabamento" });
      expect(Array.from(acabamento.options, (option) => option.textContent)).toEqual(["Normal", "Holo", "Reverse"]);
      await userEvent.click(screen.getByRole("checkbox", { name: "1ª edição" }));
      await userEvent.click(screen.getByRole("button", { name: "Adicionar à coleção" }));
      expect(await screen.findByRole("status")).toHaveTextContent("Carta adicionada à coleção.");
      expect(requisicoes[0]).toMatchObject({ firstEdition: true });
    },
  );

  it("oculta a opção de 1ª edição quando a carta não tem essa variante", () => {
    renderWithProviders(<FormColecao card={{ ...carta, variants: { normal: true } }} lang="pt" onAdicionado={() => {}} />);

    expect(screen.getByText("Normal")).toBeInTheDocument();
    expect(screen.queryByRole("checkbox", { name: /1ª edição/ })).not.toBeInTheDocument();
  });
});
