export function indexarMinhasCartas(wishlist = [], colecao = []) {
  return {
    naWishlist: new Map(wishlist.map((item) => [item.cardId, item.id])),
    tenho: new Set(colecao.map((item) => item.cardId)),
  };
}
