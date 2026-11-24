import { temPalavra } from "./filtrosMarketplace";
import { LIMITE_BUSCA } from "./busca";
import { ACABAMENTOS, CONDICOES, TIPOS } from "./rotulos";

export const POR_PAGINA = 24;

export const ORDENACOES_COLECAO = {
  name: "Nome (A–Z)",
  recent: "Adicionadas recentemente",
};

export const VISIBILIDADES = {
  true: "Só públicas",
  false: "Só privadas",
};

export const CAMPOS_FILTRO_COLECAO = ["q", "type", "condition", "finish", "isPublic", "zerados"];

const MOTIVOS = {
  RESERVED: "Está numa troca em andamento",
  OPEN_LISTING: "Tem anúncio aberto",
  OPEN_OFFER: "Está numa oferta aberta",
};

function escolher(valor, opcoes) {
  return Object.hasOwn(opcoes, valor) ? valor : "";
}

export function filtrosDaColecao(params) {
  const q = params.get("q") ?? "";
  const type = escolher(params.get("type") ?? "", TIPOS);
  const condition = escolher(params.get("condition") ?? "", CONDICOES);
  const finish = escolher(params.get("finish") ?? "", ACABAMENTOS);
  const isPublic = escolher(params.get("isPublic") ?? "", VISIBILIDADES);
  const zerados = params.get("zerados") === "1" ? "1" : "";
  const sort = params.get("sort") === "recent" ? "recent" : "";
  const visao = params.get("visao") === "lista" ? "lista" : "grade";
  const paginaPedida = Number(params.get("page") ?? 1);
  const page = Number.isInteger(paginaPedida) && paginaPedida > 0 ? paginaPedida : 1;
  const buscaCurta = q !== "" && !temPalavra(q);
  const buscaLonga = q.trim().length > LIMITE_BUSCA;
  const qApi = buscaCurta || buscaLonga ? "" : q.trim();
  return { q, type, condition, finish, isPublic, zerados, sort, visao, page, buscaCurta, buscaLonga, qApi };
}

export function filtrosDaApi({ qApi, type, condition, finish, isPublic, zerados, sort }) {
  return { q: qApi, type, condition, finish, isPublic, sort, withZero: zerados ? "" : "false" };
}

export function rotuloDoSeloColecao(campo, valor) {
  switch (campo) {
    case "q":
      return `Nome: ${valor}`;
    case "type":
      return `Tipo: ${TIPOS[valor] ?? valor}`;
    case "condition":
      return `Condição: ${CONDICOES[valor] ?? valor}`;
    case "finish":
      return `Acabamento: ${ACABAMENTOS[valor] ?? valor}`;
    case "isPublic":
      return VISIBILIDADES[valor] ?? valor;
    case "zerados":
      return "Mostrando zerados";
    default:
      return valor;
  }
}

function plural(quantidade, singular, varias) {
  return `${quantidade} ${quantidade === 1 ? singular : varias}`;
}

export function textoTotais({ totalUnits, distinctCards, listedItems }) {
  return [
    plural(totalUnits, "carta", "cartas"),
    plural(distinctCards, "diferente", "diferentes"),
    plural(listedItems, "anunciada", "anunciadas"),
  ].join(" · ");
}

export function motivoDeNaoApagar(deleteBlockedBy) {
  return MOTIVOS[deleteBlockedBy] ?? null;
}

export function avisoDeAdicao({ item, removedFromWishlist }, quantidadePedida) {
  const nome = item.card.name;
  const somou = item.quantity > quantidadePedida;
  const principal = somou
    ? `Somamos ${quantidadePedida} ao ${nome} que você já tinha.`
    : `${nome} entrou na sua coleção.`;
  return removedFromWishlist ? `${principal} ${nome} saiu da sua wishlist.` : principal;
}

export function mudancasDoItem(item, form) {
  const dados = {};
  if (Number(form.quantity) !== item.quantity) dados.quantity = Number(form.quantity);
  if (form.condition !== item.condition) dados.condition = form.condition;
  if (form.isPublic !== item.isPublic) dados.isPublic = form.isPublic;
  return dados;
}

export function quantidadeValida(valor) {
  const numero = Number(valor);
  return valor !== "" && Number.isInteger(numero) && numero >= 1;
}

export function chaveDoItem(item) {
  return [item.id, item.quantity, item.reservedQuantity, item.condition, item.isPublic, item.deleteBlockedBy].join("-");
}
