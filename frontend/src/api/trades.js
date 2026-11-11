import { http } from "./http";

export async function createTrade(offerId) {
  const body = await http.post("/trades", { offerId });
  return body.data.trade;
}

export async function listMyTrades(status) {
  const body = await http.get("/trades/me", { params: { status: status || undefined } });
  return body.data;
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
