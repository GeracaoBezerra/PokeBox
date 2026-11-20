import { http as rota, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { CONFIG } from "../config";
import { server } from "../test/server";
import { getPublicCollection, listCollection } from "./collection";
import { listMyOffers } from "./offers";

const url = (caminho) => `${CONFIG.apiBaseUrl}${caminho}`;

function responderCom(caminho, montar) {
  const pedidos = [];
  server.use(
    rota.get(url(caminho), ({ request }) => {
      const query = Object.fromEntries(new URL(request.url).searchParams);
      pedidos.push(query);
      return HttpResponse.json(montar(query));
    })
  );
  return pedidos;
}

describe("funções de lista", () => {
  it("sem parâmetro, a coleção vem inteira como antes", async () => {
    const pedidos = responderCom("/collection", () => ({ success: true, data: { items: [{ id: "a" }] } }));

    expect(await listCollection()).toEqual([{ id: "a" }]);
    expect(pedidos).toEqual([{}]);
  });

  it("com opções, a coleção manda página e filtros e devolve a paginação", async () => {
    const pagination = { page: 2, limit: 2, hasNextPage: false };
    const pedidos = responderCom("/collection", () => ({ success: true, data: { items: [{ id: "b" }] }, pagination }));

    const resposta = await listCollection({ q: "pika", type: "", page: 2, limit: 2 });

    expect(resposta).toEqual({ items: [{ id: "b" }], pagination });
    expect(pedidos).toEqual([{ q: "pika", page: "2", limit: "2" }]);
  });

  it("perfil público paginado continua trazendo o usuário", async () => {
    const pagination = { page: 1, limit: 20, hasNextPage: false };
    responderCom("/users/ash/collection", () => ({ success: true, data: { user: { username: "ash" }, items: [] }, pagination }));

    expect(await getPublicCollection("ash", {})).toEqual({ user: { username: "ash" }, items: [], pagination });
  });

  it("ofertas com status em texto devolvem enviadas e recebidas", async () => {
    const pedidos = responderCom("/offers/me", () => ({ success: true, data: { sent: [], received: [] } }));

    expect(await listMyOffers("PROPOSED")).toEqual({ sent: [], received: [] });
    expect(pedidos).toEqual([{ status: "PROPOSED" }]);
  });

  it("ofertas com objeto pedem um lado paginado", async () => {
    const pagination = { page: 1, limit: 20, hasNextPage: true };
    const pedidos = responderCom("/offers/me", () => ({ success: true, data: { items: [{ id: "o1" }] }, pagination }));

    expect(await listMyOffers({ side: "received", status: "" })).toEqual({ items: [{ id: "o1" }], pagination });
    expect(pedidos).toEqual([{ side: "received", page: "1", limit: "20" }]);
  });
});
