import { screen } from "@testing-library/react";
import { http as rota, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { CONFIG } from "../../config";
import { renderWithProviders } from "../../test/renderWithProviders";
import { server } from "../../test/server";
import AdicionarNaColecao from "./AdicionarNaColecao";

const url = (caminho) => `${CONFIG.apiBaseUrl}${caminho}`;
const carta = { id: "base1-4", name: "Charizard", set: { name: "Base Set" } };

describe("AdicionarNaColecao", () => {
  it("reserva o espaço do formulário e anuncia acessivelmente o carregamento dos detalhes", async () => {
    let liberar;
    const detalhes = new Promise((resolver) => { liberar = resolver; });
    server.use(
      rota.get(url("/cards/:id"), async () => {
        await detalhes;
        return HttpResponse.json({
          success: true,
          data: { card: { ...carta, variants: { normal: true, holo: true, firstEdition: true } } },
        });
      })
    );

    const { container } = renderWithProviders(<AdicionarNaColecao carta={carta} lang="pt" onAdicionado={() => {}} />);
    const carregando = screen.getByRole("status", { name: "Carregando detalhes da carta" });
    expect(carregando).toHaveAttribute("aria-busy", "true");
    expect(carregando).toHaveTextContent("Carregando detalhes da carta");
    expect(carregando.querySelector("button")).toBeNull();
    expect(container.querySelectorAll('[aria-hidden="true"]')).toHaveLength(1);

    liberar();
    expect(await screen.findByLabelText("Acabamento")).toBeInTheDocument();
    expect(screen.queryByRole("status", { name: "Carregando detalhes da carta" })).not.toBeInTheDocument();
  });
});
