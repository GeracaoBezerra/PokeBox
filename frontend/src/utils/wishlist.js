import { temPalavra } from "./filtrosMarketplace";
import { LIMITE_BUSCA } from "./busca";
import { TIPOS } from "./rotulos";

export const POR_PAGINA = 23;

export const ORDENACOES_WISHLIST = {
  name: "Nome (A–Z)",
  recent: "Mais recentes",
};

export const CAMPOS_FILTRO_WISHLIST = ["q", "type", "rarity", "setId"];

export function filtrosDaWishlist(params) {
  const q = params.get("q") ?? "";
  const tipoPedido = params.get("type") ?? "";
  const type = Object.hasOwn(TIPOS, tipoPedido) ? tipoPedido : "";
  const raridadePedida = (params.get("rarity") ?? "").trim();
  const rarity = raridadePedida.length <= LIMITE_BUSCA ? raridadePedida : "";
  const setIdPedido = params.get("setId") ?? "";
  const setId = /^[a-z\d.-]{1,30}$/i.test(setIdPedido) ? setIdPedido : "";
  const sort = params.get("sort") === "recent" ? "recent" : "";
  const paginaPedida = Number(params.get("page") ?? 1);
  const page = Number.isInteger(paginaPedida) && paginaPedida > 0 ? paginaPedida : 1;
  const buscaCurta = q !== "" && !temPalavra(q);
  const buscaLonga = q.trim().length > LIMITE_BUSCA;
  const qApi = buscaCurta || buscaLonga ? "" : q.trim();
  return { q, type, rarity, setId, sort, page, buscaCurta, buscaLonga, qApi };
}

export function textoColecionadores(quantidade) {
  if (!quantidade) return "Ninguém tem ainda";
  return quantidade === 1 ? "1 colecionador tem esta carta" : `${quantidade} colecionadores têm esta carta`;
}

export function rotuloDoSeloWishlist(campo, valor) {
  switch (campo) {
    case "q":
      return `Nome: ${valor}`;
    case "type":
      return `Tipo: ${TIPOS[valor] ?? valor}`;
    case "rarity":
      return `Raridade: ${valor}`;
    case "setId":
      return `Expansão: ${valor}`;
    default:
      return valor;
  }
}
