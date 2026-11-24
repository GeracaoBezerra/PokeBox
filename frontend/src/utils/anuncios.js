export const ABAS_ANUNCIOS = [
  { valor: "ativos", rotulo: "Ativos", status: ["ACTIVE", "IN_TRADE"] },
  { valor: "pausados", rotulo: "Pausados", status: ["PAUSED"] },
  { valor: "encerrados", rotulo: "Encerrados", status: ["CLOSED", "BLOCKED"] },
];

const STATUS_ABERTOS = ["ACTIVE", "PAUSED", "IN_TRADE"];

export function abaDaUrl(valor) {
  return ABAS_ANUNCIOS.some((aba) => aba.valor === valor) ? valor : "ativos";
}

export function anunciosDaAba(anuncios, valor) {
  const { status } = ABAS_ANUNCIOS.find((aba) => aba.valor === valor);
  return anuncios.filter((anuncio) => status.includes(anuncio.status));
}

export function contagemPorAba(anuncios) {
  return Object.fromEntries(ABAS_ANUNCIOS.map((aba) => [aba.valor, anunciosDaAba(anuncios, aba.valor).length]));
}

export function chaveDoAnuncio(anuncio) {
  return [anuncio.id, anuncio.status, anuncio.quantity, anuncio.description ?? "", anuncio.updatedAt].join(":");
}

export function editavel(anuncio) {
  return anuncio.status === "ACTIVE" || anuncio.status === "PAUSED";
}

export function comLivre(itens, anuncios) {
  const anunciado = new Map();
  for (const anuncio of anuncios) {
    if (!STATUS_ABERTOS.includes(anuncio.status)) continue;
    anunciado.set(anuncio.item.id, (anunciado.get(anuncio.item.id) ?? 0) + anuncio.quantity);
  }
  return itens.map((item) => ({ ...item, livre: Math.max(0, item.available - (anunciado.get(item.id) ?? 0)) }));
}

export function livresParaAnunciar(itens, anuncios) {
  return comLivre(itens, anuncios).filter((item) => item.livre > 0);
}

export function mudancasDoAnuncio(anuncio, form) {
  const mudancas = {};
  if (Number(form.quantity) !== anuncio.quantity) mudancas.quantity = Number(form.quantity);
  if (form.description.trim() !== (anuncio.description ?? "")) mudancas.description = form.description.trim();
  return mudancas;
}
