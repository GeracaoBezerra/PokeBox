export const IDIOMA_PADRAO = "pt";
export const IDIOMA_RESERVA = "en";
export const IDIOMAS = {
  pt: "Português",
  en: "Inglês",
  es: "Espanhol",
  fr: "Francês",
  de: "Alemão",
  it: "Italiano",
  ja: "Japonês",
};

export async function buscarComReserva(buscar, idiomaPedido) {
  if (idiomaPedido) return { dados: await buscar(idiomaPedido), lang: idiomaPedido, reserva: false };
  try {
    return { dados: await buscar(IDIOMA_PADRAO), lang: IDIOMA_PADRAO, reserva: false };
  } catch (erro) {
    if (erro?.status !== 404) throw erro;
    return { dados: await buscar(IDIOMA_RESERVA), lang: IDIOMA_RESERVA, reserva: true };
  }
}

export function linkBuscaNaReserva(nome) {
  const params = new URLSearchParams({ name: nome, lang: IDIOMA_RESERVA });
  return `/catalogo?${params}`;
}
