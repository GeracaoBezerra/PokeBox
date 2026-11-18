export function semVazios(parametros) {
  return Object.fromEntries(Object.entries(parametros).filter(([, valor]) => valor !== "" && valor != null));
}
