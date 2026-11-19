import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http as rota, HttpResponse } from "msw";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CONFIG } from "../../config";
import { server } from "../../test/server";
import ConfirmacaoProvider from "../ConfirmacaoProvider/ConfirmacaoProvider";
import ToastProvider from "../ToastProvider/ToastProvider";
import AcoesAnuncio from "./AcoesAnuncio";

const url = (caminho) => `${CONFIG.apiBaseUrl}${caminho}`;
const ouvinte = vi.fn();

afterEach(() => {
  window.removeEventListener("pendencias:mudou", ouvinte);
  ouvinte.mockClear();
});

function renderizar(onMudou) {
  window.addEventListener("pendencias:mudou", ouvinte);
  server.use(rota.patch(url("/listings/a1"), async ({ request }) => HttpResponse.json({ success: true, data: { listing: { id: "a1", ...(await request.json()) } } })));
  return render(
    <ToastProvider>
      <ConfirmacaoProvider>
        <AcoesAnuncio anuncio={{ id: "a1", status: "ACTIVE" }} onMudou={onMudou} />
      </ConfirmacaoProvider>
    </ToastProvider>
  );
}

describe("AcoesAnuncio", () => {
  it("fechar com sucesso avisa que as pendências mudaram, porque as ofertas abertas são canceladas", async () => {
    const onMudou = vi.fn();
    const pessoa = userEvent.setup();
    renderizar(onMudou);

    await pessoa.click(screen.getByRole("button", { name: "Fechar" }));
    await pessoa.click(await screen.findByRole("button", { name: "Fechar anúncio" }));

    await waitFor(() => expect(onMudou).toHaveBeenCalledTimes(1));
    expect(ouvinte).toHaveBeenCalledTimes(1);
  });

  it("pausar não cancela ofertas, então não mexe nas pendências", async () => {
    const onMudou = vi.fn();
    const pessoa = userEvent.setup();
    renderizar(onMudou);

    await pessoa.click(screen.getByRole("button", { name: "Pausar" }));

    await waitFor(() => expect(onMudou).toHaveBeenCalledTimes(1));
    expect(ouvinte).not.toHaveBeenCalled();
  });
});
