import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http as rota, HttpResponse } from "msw";
import { Route, Routes, useLocation } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { CONFIG } from "../../config";
import { renderWithProviders } from "../../test/renderWithProviders";
import { server } from "../../test/server";
import RotaPrivada from "../RotaPrivada/RotaPrivada";
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

function Endereco() {
  const location = useLocation();
  return <p>Em {location.pathname}{location.state?.de ? ` vindo de ${location.state.de}` : ""}</p>;
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

  it("desativar a conta encerra a sessão e leva à home, não ao login", async () => {
    preparar();
    server.use(rota.delete(url("/user/me"), () => new HttpResponse(null, { status: 204 })));
    renderWithProviders(
      <Routes>
        <Route path="/" element={<Endereco />} />
        <Route path="/login" element={<Endereco />} />
        <Route element={<RotaPrivada />}>
          <Route path="/perfil" element={<Perfil />} />
        </Route>
      </Routes>,
      { rota: "/perfil" }
    );

    await userEvent.click(await screen.findByRole("button", { name: "Conta" }));
    await userEvent.click(screen.getByRole("button", { name: "Desativar minha conta" }));
    const modal = screen.getByRole("dialog", { name: "Desativar sua conta?" });
    await userEvent.type(within(modal).getByRole("textbox"), "ash");
    await userEvent.click(within(modal).getByRole("button", { name: "Desativar conta" }));

    expect(await screen.findByText("Em /")).toBeInTheDocument();
  });

  it("enquanto carrega mostra o esqueleto com o menu, não uma tela vazia", async () => {
    let liberar;
    const espera = new Promise((resolver) => {
      liberar = resolver;
    });
    server.use(
      rota.get(url("/auth/me"), async () => {
        await espera;
        return HttpResponse.json({ success: true, data: { user } });
      }),
      rota.get(url("/trades/me"), () => HttpResponse.json({ success: true, data: { sent: [], received: [] } }))
    );
    renderWithProviders(<Perfil />, { rota: "/perfil" });

    expect(screen.getByRole("status", { name: "Carregando perfil" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Minhas trocas" })).toBeInTheDocument();

    liberar();

    expect(await screen.findByRole("heading", { name: "Meu perfil" })).toBeInTheDocument();
    expect(screen.queryByRole("status", { name: "Carregando perfil" })).not.toBeInTheDocument();
  });
});
