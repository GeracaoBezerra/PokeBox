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

// status: "concluida" | "pendente" | "cancelada"
export const trocasExemplo = [
  {
    id: 1,
    data: "2026-10-24",
    parceiro: "brock_cards",
    ofereceu: "Charizard ex",
    recebeu: "Umbreon ex",
    status: "pendente",
  },
  {
    id: 2,
    data: "2026-10-12",
    parceiro: "misty_tcg",
    ofereceu: "Squirtle",
    recebeu: "Eevee ex",
    status: "concluida",
  },
  {
    id: 3,
    data: "2026-09-30",
    parceiro: "gary_oak",
    ofereceu: "Mew ex",
    recebeu: "Gardevoir ex",
    status: "cancelada",
  },
];
