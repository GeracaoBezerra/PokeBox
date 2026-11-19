export function indexarMinhasCartas(wishlist = [], colecao = []) {
  return {
    naWishlist: new Map(wishlist.map((item) => [item.cardId, item.id])),
    tenho: new Set(colecao.map((item) => item.cardId)),
  };
}

function lido(resultado, antigo) {
  return resultado.status === "fulfilled" ? resultado.value : antigo ?? null;
}

export function juntarMinhasCartas(anterior, [wishlist, colecao]) {
  const falha = [wishlist, colecao].find((resultado) => resultado.status === "rejected");
  return {
    wishlist: lido(wishlist, anterior?.wishlist),
    colecao: lido(colecao, anterior?.colecao),
    erro: falha ? falha.reason : null,
  };
}
