import { http } from "./http";
import { semVazios } from "./parametros";

export async function listWishlist(opcoes) {
  if (!opcoes) {
    const body = await http.get("/wishlist");
    return body.data.items;
  }
  const { page = 1, limit = 20, ...filtros } = opcoes;
  const body = await http.get("/wishlist", { params: { ...semVazios(filtros), page, limit } });
  return { items: body.data.items, pagination: body.pagination };
}

export async function addToWishlist(cardId, lang) {
  const body = await http.post("/wishlist", { cardId, lang });
  return body.data.item;
}

export async function removeFromWishlist(id) {
  await http.delete(`/wishlist/${id}`);
}
