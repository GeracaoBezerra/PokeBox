const SEM_CONEXAO = "Não conseguimos falar com o servidor. Confira sua internet e tente de novo.";
const ERRO_NOSSO = "Algo deu errado do nosso lado. Tente de novo em instantes.";
const PADRAO = "Não foi possível concluir. Tente de novo.";
const CONFIRA_CAMPOS = "Confira os campos destacados.";

const PADRAO_POR_STATUS = {
  403: "Você não tem permissão para fazer isso.",
  404: "Não encontramos o que você procurou.",
};

export function errosPorCampo(details) {
  const erros = {};
  for (const { field, message } of details ?? []) {
    if (field && !erros[field]) erros[field] = message;
  }
  return erros;
}

function mensagemDosCampos(details, camposMarcados) {
  const comCampo = (details ?? []).filter((detalhe) => detalhe.field);
  if (comCampo.length === 0) return null;
  const foraDaTela = comCampo.find((detalhe) => !camposMarcados.includes(detalhe.field));
  return foraDaTela ? foraDaTela.message : CONFIRA_CAMPOS;
}

export function mensagemAmigavel(erro, camposMarcados = []) {
  if (!erro) return "";
  if (erro.status === 0) return SEM_CONEXAO;
  if (erro.status >= 500) return ERRO_NOSSO;
  if (erro.status === 400) {
    const dosCampos = mensagemDosCampos(erro.details, camposMarcados);
    if (dosCampos) return dosCampos;
  }
  if (erro.message) return erro.message;
  return PADRAO_POR_STATUS[erro.status] ?? PADRAO;
}
