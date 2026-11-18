import { http } from "./http";
import { semVazios } from "./parametros";

export async function createTrade(offerId) {
  const body = await http.post("/trades", { offerId });
  return body.data.trade;
}

export async function listMyTrades(opcoes) {
  if (typeof opcoes !== "object" || opcoes === null) {
    const body = await http.get("/trades/me", { params: { status: opcoes || undefined } });
    return body.data;
  }
  const { side, status, page = 1, limit = 20 } = opcoes;
  const body = await http.get("/trades/me", { params: semVazios({ side, status, page, limit }) });
  return { items: body.data.items, pagination: body.pagination };
}

export async function getTrade(id) {
  const body = await http.get(`/trades/${id}`);
  return body.data.trade;
}

export async function acceptTrade(id) {
  const body = await http.post(`/trades/${id}/accept`);
  return body.data.trade;
}

export async function rejectTrade(id) {
  const body = await http.post(`/trades/${id}/reject`);
  return body.data.trade;
}

export async function cancelTrade(id) {
  const body = await http.post(`/trades/${id}/cancel`);
  return body.data.trade;
}
