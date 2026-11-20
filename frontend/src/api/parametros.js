export function semVazios(parametros) {
  return Object.fromEntries(Object.entries(parametros).filter(([, valor]) => valor !== "" && valor != null));
}

export function parametrosDaPagina({ page = 1, limit = 20, ...filtros } = {}) {
  return { ...semVazios(filtros), page, limit };
}
