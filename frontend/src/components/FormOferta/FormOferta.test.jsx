import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http as rota, HttpResponse } from "msw";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { CONFIG } from "../../config";
import { server } from "../../test/server";
import ToastProvider from "../ToastProvider/ToastProvider";
import FormOferta from "./FormOferta";

const url = (caminho) => `${CONFIG.apiBaseUrl}${caminho}`;

const item = (id, name, available) => ({
  id,
  available,
  finish: "NORMAL",
  firstEdition: false,
  condition: "GOOD",
  card: { id: `c-${id}`, name, setName: "Base", number: "1", images: {} },
});

const anuncio = {
  id: "anuncio-1",
  quantity: 1,
  card: { name: "Charizard" },
  item: { finish: "HOLO", firstEdition: false, condition: "NEAR_MINT" },
  owner: { username: "ash" },
};

function renderizar() {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <FormOferta anuncio={anuncio} />
      </ToastProvider>
    </MemoryRouter>
  );
}

describe("FormOferta", () => {
  it("não envia quando uma carta escondida pela busca está com a quantidade inválida e diz qual é", async () => {
    const enviou = vi.fn();
    server.use(
      rota.get(url("/collection"), ({ request }) => {
        const q = new URL(request.url).searchParams.get("q");
        const items = q ? [] : [item("1", "Fire Energy", 3), item("2", "Pikachu", 1)];
        return HttpResponse.json({ success: true, data: { items }, pagination: { hasNextPage: false } });
      }),
      rota.post(url("/listings/anuncio-1/offers"), () => {
        enviou();
        return HttpResponse.json({ success: true, data: { offer: {} } }, { status: 201 });
      })
    );
    const pessoa = userEvent.setup();
    renderizar();

    await pessoa.click(await screen.findByRole("checkbox", { name: "Oferecer Fire Energy" }));
    await pessoa.clear(screen.getByRole("spinbutton", { name: "Quantidade de Fire Energy oferecida" }));
    await pessoa.type(screen.getByRole("searchbox", { name: "Buscar na sua coleção" }), "pika");
    await waitFor(() => expect(screen.queryByRole("checkbox", { name: "Oferecer Fire Energy" })).not.toBeInTheDocument());
    await pessoa.click(screen.getByRole("button", { name: "Enviar oferta" }));

    expect(await screen.findByText("Corrija a quantidade oferecida de Fire Energy (de 1 a 3) antes de enviar.")).toBeInTheDocument();
    expect(enviou).not.toHaveBeenCalled();
  });

  it("da busca na API, mostra só as cartas com o termo no nome, e não as que só batem pela expansão", async () => {
    const daExpansao = { ...item("9", "Bulbasaur", 1), card: { ...item("9", "Bulbasaur", 1).card, setName: "FireRed & LeafGreen" } };
    server.use(
      rota.get(url("/collection"), ({ request }) => {
        const q = new URL(request.url).searchParams.get("q");
        const items = q ? [item("8", "Fire Crystal", 1), daExpansao] : [item("1", "Pikachu", 1)];
        return HttpResponse.json({ success: true, data: { items }, pagination: { hasNextPage: q ? false : true } });
      })
    );
    const pessoa = userEvent.setup();
    renderizar();

    await pessoa.type(await screen.findByRole("searchbox", { name: "Buscar na sua coleção" }), "fire");

    expect(await screen.findByRole("checkbox", { name: "Oferecer Fire Crystal" })).toBeInTheDocument();
    expect(screen.queryByRole("checkbox", { name: "Oferecer Bulbasaur" })).not.toBeInTheDocument();
  });
});
