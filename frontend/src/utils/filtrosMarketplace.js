export function temPalavra(texto) {
  return texto.split(/\s+/).some((palavra) => palavra.length >= 2 && /[\p{L}\p{N}]/u.test(palavra));
}

export function usernameValido(texto) {
  return /^[a-z0-9_]{3,20}$/.test(texto);
}
