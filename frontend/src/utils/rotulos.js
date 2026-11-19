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
