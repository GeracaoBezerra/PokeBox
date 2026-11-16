export function cartaDoCatalogo(carta, lang) {
  return {
    id: carta.id,
    nome: carta.name,
    numero: carta.localId,
    src: carta.image?.small,
    link: `/cards/${carta.id}?lang=${lang}`,
  };
}
