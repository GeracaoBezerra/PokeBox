import { http } from "./http";
import { parametrosDaPagina } from "./parametros";

export async function createOffer(listingId, data) {
  const body = await http.post(`/listings/${listingId}/offers`, data);
  return body.data.offer;
}

export async function listMyOffers(opcoes) {
  if (typeof opcoes !== "object" || opcoes === null) {
    const body = await http.get("/offers/me", { params: { status: opcoes || undefined } });
    return body.data;
  }
  const { side, status, page, limit } = opcoes;
  const body = await http.get("/offers/me", { params: parametrosDaPagina({ side, status, page, limit }) });
  return { items: body.data.items, pagination: body.pagination };
}

export async function getOffer(id) {
  const body = await http.get(`/offers/${id}`);
  return body.data.offer;
}

export async function updateOfferStatus(id, status) {
  const body = await http.patch(`/offers/${id}/status`, { status });
  return body.data.offer;
}
