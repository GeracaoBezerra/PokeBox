import { soDigitos } from "./mascaras";

export const UFS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA",
  "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
];

export const CAMPOS_EDITAVEIS = ["name", "phone", "cep", "street", "number", "complement", "neighborhood", "city", "state"];

const SO_DIGITOS = ["phone", "cep"];

const LIMITES = { street: 150, number: 10, complement: 100, neighborhood: 100, city: 100 };

export function limparValor(chave, valor) {
  const texto = String(valor ?? "").trim();
  return SO_DIGITOS.includes(chave) ? soDigitos(texto) : texto;
}

export function validarPerfil(valores) {
  const erros = {};
  const limpo = (chave) => limparValor(chave, valores[chave]);

  if ("name" in valores) {
    const nome = limpo("name");
    if (nome.length < 2 || nome.length > 120) erros.name = "Nome com 2 a 120 caracteres";
  }

  const telefone = limpo("phone");
  if (telefone && !/^\d{10,11}$/.test(telefone)) erros.phone = "Telefone com DDD: 10 ou 11 dígitos";

  const cep = limpo("cep");
  if (cep && !/^\d{8}$/.test(cep)) erros.cep = "CEP com 8 dígitos";

  const uf = limpo("state").toUpperCase();
  if (uf && !UFS.includes(uf)) erros.state = "Escolha uma das siglas da lista";

  for (const [chave, limite] of Object.entries(LIMITES)) {
    if (limpo(chave).length > limite) erros[chave] = `No máximo ${limite} caracteres`;
  }

  return erros;
}

export function montarMudancas(valores, atual) {
  const mudancas = {};
  for (const chave of CAMPOS_EDITAVEIS) {
    if (!(chave in valores)) continue;
    const novo = limparValor(chave, valores[chave]);
    if (novo !== (atual[chave] ?? "")) mudancas[chave] = novo === "" ? null : novo;
  }
  return mudancas;
}
