import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";
import { CONFIG } from "../../config";
import { renderWithProviders } from "../../test/renderWithProviders";
import { server } from "../../test/server";
import CartaoTroca from "./CartaoTroca";

const url = (caminho) => `${CONFIG.apiBaseUrl}${caminho}`;
const carta = (id, name) => ({ id, name, imageUrl: null });

const troca = {
  id: "t1",
  status: "PROPOSED",
  createdAt: "2026-11-20T12:00:00Z",
  completedAt: null,
  proposerConfirmedAt: null,
  recipientConfirmedAt: null,
  proposer: { username: "misty" },
  recipient: { username: "ash" },
  items: [
    { card: carta("sm1-9", "Rowlet"), quantity: 1, condition: "MINT", finish: "NORMAL", from: "ash", to: "misty" },
    { card: carta("base1-53", "Psyduck"), quantity: 1, condition: "MINT", finish: "NORMAL", from: "misty", to: "ash" },
  ],
};

function renderizar(props) {
  const onMudou = vi.fn();
  renderWithProviders(<CartaoTroca troca={troca} souDonoDoAnuncio onMudou={onMudou} {...props} />);
  return { onMudou, cartao: screen.getByText(/com @/).closest("[data-cy='cartao-troca']") };
}

describe("CartaoTroca", () => {
  it("ninguém confirmou: as duas partes podem confirmar o recebimento", () => {
    const dono = renderizar();
    expect(within(dono.cartao).getByText("Confirme quando receber as cartas.")).toBeVisible();
    expect(within(dono.cartao).getByRole("button", { name: "Confirmar recebimento" })).toBeEnabled();
    expect(within(dono.cartao).getByRole("button", { name: "Recusar troca" })).toBeEnabled();
    expect(dono.cartao).toHaveAttribute("data-pendente", "true");
  });

  it("quem ofertou também confirma e desiste com Cancelar troca", () => {
    const { cartao } = renderizar({ souDonoDoAnuncio: false });
    expect(within(cartao).getByRole("button", { name: "Confirmar recebimento" })).toBeEnabled();
    expect(within(cartao).getByRole("button", { name: "Cancelar troca" })).toBeEnabled();
    expect(within(cartao).queryByRole("button", { name: "Recusar troca" })).toBeNull();
  });

  it("depois de você confirmar, espera o outro e ainda deixa desistir", () => {
    const { cartao } = renderizar({ troca: { ...troca, recipientConfirmedAt: "2026-11-20T13:00:00Z" } });
    expect(within(cartao).getByText("Você confirmou. Aguardando @misty confirmar.")).toBeVisible();
    expect(within(cartao).queryByRole("button", { name: "Confirmar recebimento" })).toBeNull();
    expect(within(cartao).getByRole("button", { name: "Recusar troca" })).toBeEnabled();
    expect(cartao).toHaveAttribute("data-pendente", "false");
  });

  it("quando o outro confirmou, avisa e pede a sua confirmação", () => {
    const { cartao } = renderizar({ troca: { ...troca, proposerConfirmedAt: "2026-11-20T13:00:00Z" } });
    expect(within(cartao).getByText("@misty já confirmou. Confirme quando receber as cartas.")).toBeVisible();
    expect(within(cartao).getByRole("button", { name: "Confirmar recebimento" })).toBeEnabled();
  });

  it("troca concluída não tem ações", () => {
    const concluida = { ...troca, status: "ACCEPTED", proposerConfirmedAt: "x", recipientConfirmedAt: "y", completedAt: "2026-11-21T10:00:00Z" };
    const { cartao } = renderizar({ troca: concluida });
    expect(within(cartao).getByText("As cartas já mudaram de dono.")).toBeVisible();
    expect(within(cartao).queryByRole("button")).toBeNull();
  });

  it("confirmar mostra o que você dá e recebe e chama POST /trades/:id/accept", async () => {
    let chamou = false;
    server.use(
      http.post(url("/trades/t1/accept"), () => {
        chamou = true;
        return HttpResponse.json({ success: true, data: { trade: { ...troca, recipientConfirmedAt: "2026-11-20T13:00:00Z" } } });
      })
    );
    const { cartao, onMudou } = renderizar();

    await userEvent.click(within(cartao).getByRole("button", { name: "Confirmar recebimento" }));
    const modal = screen.getByRole("dialog", { name: "Confirmar que recebeu as cartas?" });
    expect(within(modal).getByText(/Você dá: 1× Rowlet\. Você recebe: 1× Psyduck\./)).toBeVisible();
    expect(within(modal).getByText(/Quando você e @misty confirmarem, as cartas mudam de dono/)).toBeVisible();
    await userEvent.click(within(modal).getByRole("button", { name: "Confirmar recebimento" }));

    expect(await screen.findByText("Recebimento confirmado. Aguardando @misty confirmar.")).toBeVisible();
    expect(chamou).toBe(true);
    expect(onMudou).toHaveBeenCalled();
  });

  it("a segunda confirmação conclui a troca", async () => {
    server.use(
      http.post(url("/trades/t1/accept"), () =>
        HttpResponse.json({ success: true, data: { trade: { ...troca, status: "ACCEPTED" } } })
      )
    );
    const { cartao } = renderizar({ troca: { ...troca, proposerConfirmedAt: "2026-11-20T13:00:00Z" } });

    await userEvent.click(within(cartao).getByRole("button", { name: "Confirmar recebimento" }));
    await userEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Confirmar recebimento" }));

    expect(await screen.findByText("Troca concluída: as cartas mudaram de dono.")).toBeVisible();
  });

  it("quem ofertou pode cancelar depois de ter confirmado", async () => {
    let chamou = false;
    server.use(
      http.post(url("/trades/t1/cancel"), () => {
        chamou = true;
        return HttpResponse.json({ success: true, data: { trade: { ...troca, status: "CANCELED" } } });
      })
    );
    const { cartao } = renderizar({ souDonoDoAnuncio: false, troca: { ...troca, proposerConfirmedAt: "2026-11-20T13:00:00Z" } });

    expect(within(cartao).queryByRole("button", { name: "Confirmar recebimento" })).toBeNull();
    await userEvent.click(within(cartao).getByRole("button", { name: "Cancelar troca" }));
    await userEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Cancelar troca" }));

    expect(await screen.findByText("Troca cancelada. A reserva foi liberada.")).toBeVisible();
    expect(chamou).toBe(true);
  });

  it("o dono pode recusar depois de ter confirmado", async () => {
    let chamou = false;
    server.use(
      http.post(url("/trades/t1/reject"), () => {
        chamou = true;
        return HttpResponse.json({ success: true, data: { trade: { ...troca, status: "REJECTED" } } });
      })
    );
    const { cartao } = renderizar({ troca: { ...troca, recipientConfirmedAt: "2026-11-20T13:00:00Z" } });

    await userEvent.click(within(cartao).getByRole("button", { name: "Recusar troca" }));
    await userEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Recusar troca" }));

    expect(await screen.findByText("Troca recusada. A reserva foi liberada.")).toBeVisible();
    expect(chamou).toBe(true);
  });
});
