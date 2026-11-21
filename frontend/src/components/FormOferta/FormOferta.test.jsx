import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http as rota, HttpResponse } from "msw";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
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

function Propostas() {
  const { pathname, search, state } = useLocation();
  return <p>{`${pathname}${search} ${state?.aviso}`}</p>;
}

describe("FormOferta", () => {
  it("depois de enviar, vai para Propostas na aba Enviadas com o aviso", async () => {
    server.use(
      rota.get(url("/collection"), () =>
        HttpResponse.json({ success: true, data: { items: [item("1", "Pikachu", 1)] }, pagination: { hasNextPage: false } })
      ),
      rota.post(url("/listings/anuncio-1/offers"), () => HttpResponse.json({ success: true, data: { offer: {} } }, { status: 201 }))
    );
    const pessoa = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/marketplace/anuncio-1"]}>
        <ToastProvider>
          <Routes>
            <Route path="/marketplace/:id" element={<FormOferta anuncio={anuncio} />} />
            <Route path="/propostas" element={<Propostas />} />
          </Routes>
        </ToastProvider>
      </MemoryRouter>
    );

    await pessoa.click(await screen.findByRole("checkbox", { name: "Oferecer Pikachu" }));
    await pessoa.click(screen.getByRole("button", { name: "Enviar oferta" }));

    expect(await screen.findByText("/propostas?aba=enviadas Oferta enviada para @ash.")).toBeInTheDocument();
  });

  it("a barra de envio mostra quantas cartas estão marcadas e só habilita o botão com alguma", async () => {
    server.use(
      rota.get(url("/collection"), () =>
        HttpResponse.json({ success: true, data: { items: [item("1", "Pikachu", 1), item("2", "Magikarp", 2)] }, pagination: { hasNextPage: false } })
      )
    );
    const pessoa = userEvent.setup();
    renderizar();

    await pessoa.click(await screen.findByRole("checkbox", { name: "Oferecer Pikachu" }));
    expect(screen.getByText("1 carta selecionada")).toBeInTheDocument();
    await pessoa.click(screen.getByRole("checkbox", { name: "Oferecer Magikarp" }));
    expect(screen.getByText("2 cartas selecionadas")).toBeInTheDocument();
    await pessoa.click(screen.getByRole("checkbox", { name: "Oferecer Pikachu" }));
    await pessoa.click(screen.getByRole("checkbox", { name: "Oferecer Magikarp" }));
    expect(screen.getByText("Nenhuma carta selecionada")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Enviar oferta" })).toBeDisabled();
  });

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
