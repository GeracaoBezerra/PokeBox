import { http } from "./http";

export async function listListings({ cardId, username, page = 1, limit = 20 } = {}) {
  const body = await http.get("/listings", {
    params: { cardId: cardId || undefined, username: username || undefined, page, limit },
  });
  return { items: body.data.items, pagination: body.pagination };
}

export async function listMyListings() {
  const body = await http.get("/listings/me");
  return body.data.items;
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
