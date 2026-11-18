import { http } from "./http";

export async function listWishlist() {
  const body = await http.get("/wishlist");
  return body.data.items;
}

export async function addToWishlist(cardId, lang) {
  const body = await http.post("/wishlist", { cardId, lang });
  return body.data.item;
}

export async function removeFromWishlist(id) {
  await http.delete(`/wishlist/${id}`);
}
