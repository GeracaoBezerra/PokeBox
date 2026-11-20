export const CONDICOES = {
  MINT: "Mint",
  NEAR_MINT: "Near Mint",
  EXCELLENT: "Excellent",
  GOOD: "Good",
  LIGHT_PLAYED: "Light Played",
  PLAYED: "Played",
  POOR: "Poor",
};

export const ACABAMENTOS = {
  NORMAL: "Normal",
  HOLO: "Holo",
  REVERSE: "Reverse",
};

export const TIPOS = {
  Colorless: "Incolor",
  Darkness: "Sombrio",
  Dragon: "Dragão",
  Fairy: "Fada",
  Fighting: "Lutador",
  Fire: "Fogo",
  Grass: "Planta",
  Lightning: "Elétrico",
  Metal: "Metal",
  Psychic: "Psíquico",
  Water: "Água",
};

export const CATEGORIAS = { Pokemon: "Pokémon", Trainer: "Treinador", Energy: "Energia" };

export const ORDENACOES = {
  recent: "Mais novos",
  oldest: "Mais antigos",
  name: "Nome da carta",
};

export const STATUS_ANUNCIO = {
  ACTIVE: "Ativo",
  PAUSED: "Pausado",
  CLOSED: "Fechado",
  BLOCKED: "Bloqueado",
  IN_TRADE: "Em troca",
};

export const STATUS_NEGOCIACAO = {
  PROPOSED: "Aguardando resposta",
  ACCEPTED: "Aceita",
  REJECTED: "Recusada",
  CANCELED: "Cancelada",
};

export const STATUS_TROCA = {
  PROPOSED: "Em andamento",
  ACCEPTED: "Concluída",
  REJECTED: "Recusada",
  CANCELED: "Cancelada",
};

export function variante({ finish, firstEdition }) {
  return `${ACABAMENTOS[finish] ?? finish}${firstEdition ? " · 1ª edição" : ""}`;
}

export function formatarData(iso) {
  return iso ? new Date(iso).toLocaleDateString("pt-BR") : "";
}

export function precoReferencia({ marketPrice, marketPriceCurrency, marketPriceSource }) {
  if (marketPrice == null || !marketPriceCurrency) return null;
  const valor = Number(marketPrice).toLocaleString("pt-BR", { style: "currency", currency: marketPriceCurrency });
  return `${valor} · referência ${marketPriceSource === "cardmarket" ? "Cardmarket" : "TCGplayer"}`;
}

export function contarOfertasAguardando(recebidas, anuncioId) {
  return (recebidas ?? []).filter((oferta) => oferta.listing?.id === anuncioId).length;
}

export function textoOfertasAguardando(quantidade) {
  if (quantidade === 0) return "Nenhuma oferta aguardando resposta";
  if (quantidade === 1) return "1 oferta aguardando sua resposta";
  return `${quantidade} ofertas aguardando sua resposta`;
}

export function descreverCartas(itens) {
  if (!itens?.length) return "nenhuma carta";
  return itens.map((item) => `${item.quantity}× ${item.card.name}`).join(", ");
}

export function motivoCancelamento({ cancelReason, recebida, dono, proponente }) {
  if (cancelReason === "PROPOSER") return recebida ? `@${proponente} cancelou a oferta.` : "Você cancelou a oferta.";
  if (cancelReason === "LISTING_CLOSED") return recebida ? "Cancelada: você fechou o anúncio." : `Cancelada: @${dono} fechou o anúncio.`;
  if (cancelReason === "LISTING_BLOCKED") return "Cancelada: o anúncio foi bloqueado pela moderação.";
  if (cancelReason === "LISTING_TRADED") return "Cancelada: o anúncio foi trocado com outra pessoa.";
  if (cancelReason === "ACCOUNT_DEACTIVATED") return "Cancelada: a conta foi desativada.";
  return "Encerrada.";
}

export function textoEmEspera({ recebida, statusDoAnuncio }) {
  if (!recebida) return "Em espera: o anúncio está em negociação; se a troca não acontecer, sua oferta volta a valer.";
  if (statusDoAnuncio && statusDoAnuncio !== "IN_TRADE") return "Em espera: este anúncio não tem quantidade suficiente agora.";
  return "Em espera: este anúncio está em troca com outra pessoa.";
}

export function proximoPassoOferta({ status, recebida, virouTroca, emEspera, statusDoAnuncio, cancelReason, dono, proponente }) {
  if (virouTroca) return "Virou troca: as cartas estão reservadas. Confirme o recebimento em Trocas.";
  if (status === "PROPOSED" && emEspera) return textoEmEspera({ recebida, statusDoAnuncio });
  if (status === "PROPOSED") return recebida ? "Aceite ou recuse esta oferta." : `Aguardando @${dono} responder.`;
  if (status === "ACCEPTED") return "Aceita.";
  if (status === "CANCELED") return motivoCancelamento({ cancelReason, recebida, dono, proponente });
  return "Encerrada.";
}

export function proximoPassoTroca({ status, euConfirmei, parceiroConfirmou, parceiro }) {
  if (status === "PROPOSED") {
    if (euConfirmei) return `Você confirmou. Aguardando @${parceiro} confirmar.`;
    if (parceiroConfirmou) return `@${parceiro} já confirmou. Confirme quando receber as cartas.`;
    return "Confirme quando receber as cartas.";
  }
  if (status === "ACCEPTED") return "As cartas já mudaram de dono.";
  return "As cartas reservadas voltaram a ficar disponíveis.";
}

export function confirmacoesDaTroca(troca, souDonoDoAnuncio) {
  const doDono = Boolean(troca.recipientConfirmedAt);
  const deQuemOfertou = Boolean(troca.proposerConfirmedAt);
  return souDonoDoAnuncio
    ? { euConfirmei: doDono, parceiroConfirmou: deQuemOfertou }
    : { euConfirmei: deQuemOfertou, parceiroConfirmou: doDono };
}

export function esperaMinhaConfirmacao(troca, souDonoDoAnuncio) {
  return troca.status === "PROPOSED" && !confirmacoesDaTroca(troca, souDonoDoAnuncio).euConfirmei;
}
