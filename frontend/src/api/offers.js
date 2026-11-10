import { http } from "./http";

export async function createOffer(listingId, data) {
  const body = await http.post(`/listings/${listingId}/offers`, data);
  return body.data.offer;
}

export async function listMyOffers(status) {
  const body = await http.get("/offers/me", { params: { status: status || undefined } });
  return body.data;
}

export async function getOffer(id) {
  const body = await http.get(`/offers/${id}`);
  return body.data.offer;
}

export async function updateOfferStatus(id, status) {
  const body = await http.patch(`/offers/${id}/status`, { status });
  return body.data.offer;
}
