import { http } from "./http";
import { semVazios } from "./parametros";

export async function listListings({ page = 1, limit = 20, ...filtros } = {}) {
  const body = await http.get("/listings", { params: { ...semVazios(filtros), page, limit } });
  return { items: body.data.items, pagination: body.pagination };
}

export async function listMyListings(opcoes) {
  if (!opcoes) {
    const body = await http.get("/listings/me");
    return body.data.items;
  }
  const { page = 1, limit = 20, ...filtros } = opcoes;
  const body = await http.get("/listings/me", { params: { ...semVazios(filtros), page, limit } });
  return { items: body.data.items, pagination: body.pagination };
}

export async function getListing(id) {
  const body = await http.get(`/listings/${id}`);
  return body.data.listing;
}

export async function createListing(data) {
  const body = await http.post("/listings", data);
  return body.data.listing;
}

export async function updateListing(id, data) {
  const body = await http.patch(`/listings/${id}`, data);
  return body.data.listing;
}
