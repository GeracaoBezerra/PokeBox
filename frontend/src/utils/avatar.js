const CORES_AVATAR = ["agua", "planta", "fogo", "eletrico", "psiquico", "dragao", "lutador", "fada", "metal", "incolor"];

export function iniciais(nome, username = "") {
  const partes = (nome ?? "").split(" ").filter(Boolean).slice(0, 2);
  if (partes.length === 0) return (username ?? "").slice(0, 1).toUpperCase();
  return partes.map((parte) => parte[0].toUpperCase()).join("");
}

export function corDoAvatar(username) {
  let soma = 0;
  for (const letra of username ?? "") soma = (soma * 31 + letra.codePointAt(0)) >>> 0;
  const tipo = CORES_AVATAR[soma % CORES_AVATAR.length];
  return { fundo: `var(--tipo-${tipo})`, texto: `var(--tipo-${tipo}-texto)` };
}
