import { temPalavra, usernameValido } from "./filtrosMarketplace";
import { TIPOS } from "./rotulos";

export const LIMITE_BUSCA = 50;

export function filtrosDoPerfil(params) {
  const q = params.get("q") ?? "";
  const tipoPedido = params.get("type") ?? "";
  const type = Object.hasOwn(TIPOS, tipoPedido) ? tipoPedido : "";
  const paginaPedida = Number(params.get("page") ?? 1);
  const page = Number.isInteger(paginaPedida) && paginaPedida > 0 ? paginaPedida : 1;
  const buscaCurta = q !== "" && !temPalavra(q);
  const buscaLonga = q.trim().length > LIMITE_BUSCA;
  return { q, type, page, buscaCurta, buscaLonga, qApi: buscaCurta || buscaLonga ? "" : q };
}

export function tipoDeErroDoPerfil(username, erro) {
  if (!usernameValido(username)) return "naoEncontrado";
  if (!erro) return null;
  if (erro.status === 404) return "naoEncontrado";
  if (erro.status === 400) {
    const doUsername = (erro.details ?? []).some((detalhe) => detalhe.field === "username");
    return doUsername ? "naoEncontrado" : "filtro";
  }
  return "outro";
}

export function anuncioPorItem(anuncios = []) {
  return new Map(anuncios.map((anuncio) => [anuncio.item.id, anuncio]));
}

export function textoAnunciosAtivos(quantidade, temMais = false) {
  if (temMais) return `${quantidade}+ anúncios ativos`;
  if (!quantidade) return null;
  return quantidade === 1 ? "1 anúncio ativo" : `${quantidade} anúncios ativos`;
}
