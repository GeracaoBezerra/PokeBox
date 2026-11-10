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
