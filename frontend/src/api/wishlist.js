import { http } from "./http";
import { parametrosDaPagina } from "./parametros";

export async function listWishlist(opcoes) {
  if (!opcoes) {
    const body = await http.get("/wishlist");
    return body.data.items;
  }
  const body = await http.get("/wishlist", { params: parametrosDaPagina(opcoes) });
  return { items: body.data.items, pagination: body.pagination };
}

export async function addToWishlist(cardId, lang) {
  const body = await http.post("/wishlist", { cardId, lang });
  return body.data.item;
}

export async function removeFromWishlist(id) {
  await http.delete(`/wishlist/${id}`);
}
