export function recursoNaoEncontrado(erro) {
  if (erro?.status === 404) return true;
  return erro?.status === 400 && (erro.details ?? []).some((detalhe) => detalhe.field === "id");
}
