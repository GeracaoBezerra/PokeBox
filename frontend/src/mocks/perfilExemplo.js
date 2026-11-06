// DADOS DE EXEMPLO. Quando o backend existir:
// - perfil e informacoes vêm do usuário logado (GET /user/me) e o salvar
//   vira um PATCH /user/me;
// - trocas vêm do banco (histórico de ofertas/trocas do usuário).
// Este arquivo some quando a página passar a buscar da API.
export const perfilExemplo = {
  usuario: "maria_tcg",
  nomeExibicao: "Maria",
  bio: "Colecionando desde o Base Set. Aceito trocas por cartas holo.",
};

export const informacoesExemplo = {
  nome: "Maria Souza Lima",
  cpf: "123.456.789-00",
  email: "maria@exemplo.com",
  celular: "(85) 91234-5678",
  endereco: "Rua das Flores, 123",
  bairro: "Centro",
  cidade: "Fortaleza, Ceará",
  cep: "60000-000",
};

// Cada troca guarda as duas cartas (nome, set, número e imagem; na API vêm do
// snapshot local da carta).
// status: "concluida" | "pendente" | "cancelada"
// propostaPor: "voce" | "parceiro"
// respondidaEm: data em que foi aceita (concluida) ou cancelada (cancelada);
// fica null enquanto estiver pendente.
export const trocasExemplo = [
  {
    id: 1042,
    status: "pendente",
    parceiro: "brock_cards",
    propostaPor: "voce",
    propostaEm: "2026-10-24",
    respondidaEm: null,
    ofereceu: {
      id: "sv03.5-199",
      nome: "Charizard ex",
      set: "151",
      numero: "199/165",
      src: "https://assets.tcgdex.net/en/sv/sv03.5/199/low.webp",
    },
    recebeu: {
      id: "sv08.5-161",
      nome: "Umbreon ex",
      set: "Prismatic Evolutions",
      numero: "161/131",
      src: "https://assets.tcgdex.net/en/sv/sv08.5/161/low.webp",
    },
  },
  {
    id: 1037,
    status: "concluida",
    parceiro: "misty_tcg",
    propostaPor: "parceiro",
    propostaEm: "2026-10-10",
    respondidaEm: "2026-10-12",
    ofereceu: {
      id: "sv03.5-170",
      nome: "Squirtle",
      set: "151",
      numero: "170/165",
      src: "https://assets.tcgdex.net/en/sv/sv03.5/170/low.webp",
    },
    recebeu: {
      id: "sv08.5-167",
      nome: "Eevee ex",
      set: "Prismatic Evolutions",
      numero: "167/131",
      src: "https://assets.tcgdex.net/en/sv/sv08.5/167/low.webp",
    },
  },
  {
    id: 1029,
    status: "cancelada",
    parceiro: "gary_oak",
    propostaPor: "voce",
    propostaEm: "2026-09-28",
    respondidaEm: "2026-09-30",
    ofereceu: {
      id: "sv03.5-151",
      nome: "Mew ex",
      set: "151",
      numero: "151/165",
      src: "https://assets.tcgdex.net/en/sv/sv03.5/151/low.webp",
    },
    recebeu: {
      id: "sv01-245",
      nome: "Gardevoir ex",
      set: "Scarlet & Violet",
      numero: "245/198",
      src: "https://assets.tcgdex.net/en/sv/sv01/245/low.webp",
    },
  },
];