export function indexarMinhasCartas(wishlist = [], colecao = []) {
  return {
    naWishlist: new Map(wishlist.map((item) => [item.cardId, item.id])),
    tenho: new Set(colecao.map((item) => item.cardId)),
    versoes: colecao.reduce((mapa, item) => {
      const lista = mapa.get(item.cardId) ?? [];
      lista.push(item);
      mapa.set(item.cardId, lista);
      return mapa;
    }, new Map()),
    comUnidade: new Set(colecao.filter((item) => item.quantity > 0).map((item) => item.cardId)),
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
