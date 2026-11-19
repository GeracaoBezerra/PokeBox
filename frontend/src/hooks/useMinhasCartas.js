import { useRef } from "react";
import { listCollection } from "../api/collection";
import { listWishlist } from "../api/wishlist";
import { indexarMinhasCartas, juntarMinhasCartas } from "../utils/minhasCartas";
import { useCarregar } from "./useCarregar";

export function useMinhasCartas(session) {
  const chave = session ? `logado|${session.user?.username ?? ""}` : "anonimo";
  const ultimo = useRef(null);
  const { dados, carregando, recarregar } = useCarregar(async () => {
    if (!session) return null;
    const anterior = ultimo.current?.chave === chave ? ultimo.current : null;
    const resultados = await Promise.allSettled([listWishlist(), listCollection()]);
    const juntas = { chave, ...juntarMinhasCartas(anterior, resultados) };
    ultimo.current = juntas;
    return juntas;
  }, chave);
  const atuais = session && dados?.chave === chave ? dados : null;
  const conhecidas = Boolean(atuais?.wishlist && atuais?.colecao);

  return {
    minhas: conhecidas ? indexarMinhasCartas(atuais.wishlist, atuais.colecao) : null,
    erro: atuais?.erro ?? null,
    carregando,
    recarregar,
  };
}
