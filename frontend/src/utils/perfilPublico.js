import { temPalavra } from "./filtrosMarketplace";
import { TIPOS } from "./rotulos";

export function filtrosDoPerfil(params) {
  const q = params.get("q") ?? "";
  const tipoPedido = params.get("type") ?? "";
  const type = Object.hasOwn(TIPOS, tipoPedido) ? tipoPedido : "";
  const paginaPedida = Number(params.get("page") ?? 1);
  const page = Number.isInteger(paginaPedida) && paginaPedida > 0 ? paginaPedida : 1;
  const buscaCurta = q !== "" && !temPalavra(q);
  return { q, type, page, buscaCurta, qApi: buscaCurta ? "" : q };
}

export function anuncioPorItem(anuncios = []) {
  return new Map(anuncios.map((anuncio) => [anuncio.item.id, anuncio]));
}

export function textoAnunciosAtivos(quantidade, temMais = false) {
  if (temMais) return `${quantidade}+ anúncios ativos`;
  if (!quantidade) return null;
  return quantidade === 1 ? "1 anúncio ativo" : `${quantidade} anúncios ativos`;
}
