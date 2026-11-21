import { esperaMinhaConfirmacao } from "./rotulos";

export const LADOS = { recebidas: "received", enviadas: "sent" };

export function lerFiltrosNegociacao(params, statusValidos) {
  const abaPedida = params.get("aba") ?? "";
  const aba = Object.hasOwn(LADOS, abaPedida) ? abaPedida : "recebidas";
  const statusPedido = params.get("status") ?? "";
  const status = Object.hasOwn(statusValidos, statusPedido) ? statusPedido : "";
  const paginaPedida = Number(params.get("page") ?? 1);
  const page = Number.isInteger(paginaPedida) && paginaPedida > 0 ? paginaPedida : 1;
  return { aba, side: LADOS[aba], status, page };
}

export function mudarFiltros(params, mudancas, reiniciarPagina = true) {
  const novos = new URLSearchParams(params);
  for (const [campo, valor] of Object.entries(mudancas)) {
    if (valor && !(campo === "page" && Number(valor) <= 1)) novos.set(campo, String(valor));
    else novos.delete(campo);
  }
  if (reiniciarPagina) novos.delete("page");
  return novos;
}

export function trocasEsperandoConfirmacao({ sent = [], received = [] }) {
  const recebidas = received.filter((troca) => esperaMinhaConfirmacao(troca, true)).length;
  const enviadas = sent.filter((troca) => esperaMinhaConfirmacao(troca, false)).length;
  return { total: recebidas + enviadas, aba: recebidas > 0 || enviadas === 0 ? "recebidas" : "enviadas" };
}

export function resumirTrocas({ sent, received }) {
  const todas = [...sent, ...received];
  const contar = (...status) => todas.filter((troca) => status.includes(troca.status)).length;
  const esperando = trocasEsperandoConfirmacao({ sent, received });
  return {
    esperandoVoce: esperando.total,
    abaEsperando: esperando.aba,
    total: todas.length,
    concluidas: contar("ACCEPTED"),
    emAndamento: contar("PROPOSED"),
    encerradas: contar("REJECTED", "CANCELED"),
  };
}
