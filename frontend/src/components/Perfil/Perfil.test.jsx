import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http as rota, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { CONFIG } from "../../config";
import { renderWithProviders } from "../../test/renderWithProviders";
import { server } from "../../test/server";
import Perfil from "./Perfil";

const url = (caminho) => `${CONFIG.apiBaseUrl}${caminho}`;
const user = { username: "ash", name: "Ash Ketchum", email: "ash@pokebox.dev", role: "USER", accountStatus: "ACTIVE" };
const trocaPendente = { status: "PROPOSED", proposerConfirmedAt: null, recipientConfirmedAt: null };

function preparar(trocas = { sent: [], received: [] }) {
  server.use(
    rota.get(url("/auth/me"), () => HttpResponse.json({ success: true, data: { user } })),
    rota.get(url("/trades/me"), () => HttpResponse.json({ success: true, data: trocas }))
  );
}

describe("Perfil", () => {
  it("o resumo das trocas conta as que esperam a sua confirmação nos dois lados", async () => {
    preparar({ sent: [trocaPendente], received: [trocaPendente, { ...trocaPendente, recipientConfirmedAt: "2026-11-20T10:00:00Z" }] });
    renderWithProviders(<Perfil />, { rota: "/perfil" });

    await userEvent.click(await screen.findByRole("button", { name: "Minhas trocas" }));

    expect(screen.getByRole("link", { name: "2 trocas esperando sua confirmação" })).toHaveAttribute(
      "href",
      "/trocas?aba=recebidas&status=PROPOSED"
    );
  });

  it("desativar com troca aberta mostra a mensagem da API", async () => {
    preparar();
    server.use(
      rota.delete(url("/user/me"), () =>
        HttpResponse.json(
          { success: false, error: "Conclua ou cancele suas trocas antes de desativar a conta." },
          { status: 409 }
        )
      )
    );
    renderWithProviders(<Perfil />, { rota: "/perfil" });

    await userEvent.click(await screen.findByRole("button", { name: "Conta" }));
    await userEvent.click(screen.getByRole("button", { name: "Desativar minha conta" }));
    const modal = screen.getByRole("dialog", { name: "Desativar sua conta?" });
    await userEvent.type(within(modal).getByRole("textbox"), "ash");
    await userEvent.click(within(modal).getByRole("button", { name: "Desativar conta" }));

    expect(await screen.findByText("Conclua ou cancele suas trocas antes de desativar a conta.")).toBeVisible();
    expect(screen.getByRole("button", { name: "Desativar minha conta" })).toBeEnabled();
  });
});
