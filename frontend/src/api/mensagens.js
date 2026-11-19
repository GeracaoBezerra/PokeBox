const SEM_CONEXAO = "Não conseguimos falar com o servidor. Confira sua internet e tente de novo.";
const ERRO_NOSSO = "Algo deu errado do nosso lado. Tente de novo em instantes.";
const PADRAO = "Não foi possível concluir. Tente de novo.";

const PADRAO_POR_STATUS = {
  403: "Você não tem permissão para fazer isso.",
  404: "Não encontramos o que você procurou.",
};

export function mensagemAmigavel(erro) {
  if (!erro) return "";
  if (erro.status === 0) return SEM_CONEXAO;
  if (erro.status >= 500) return ERRO_NOSSO;
  if (erro.message) return erro.message;
  return PADRAO_POR_STATUS[erro.status] ?? PADRAO;
}
