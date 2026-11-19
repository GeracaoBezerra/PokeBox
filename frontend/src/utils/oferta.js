import { CONDICOES, variante } from "./rotulos";

export const LIMITE_CARTAS_OFERTA = 20;

export function normalizar(texto) {
  return (texto ?? "").normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

export function filtrarPorNome(itens, busca) {
  const termo = normalizar(busca.trim());
  if (!termo) return itens;
  return itens.filter((item) => normalizar(item.card.name).includes(termo));
}

export function unirPorId(...listas) {
  const vistos = new Set();
  return listas.flat().filter((item) => {
    if (vistos.has(item.id)) return false;
    vistos.add(item.id);
    return true;
  });
}

export function descreverCartaOferta(card, item, quantidade) {
  return `${quantidade}× ${card.name} (${variante(item)}, ${CONDICOES[item.condition] ?? item.condition})`;
}

export function textoVoceRecebe(anuncio, quantidade) {
  return `Você recebe: ${descreverCartaOferta(anuncio.card, anuncio.item, Number(quantidade) || 0)} de @${anuncio.owner.username}.`;
}

export function textoVoceDa(escolhidas) {
  if (escolhidas.length === 0) return "Você dá: escolha ao menos uma carta acima.";
  const cartas = escolhidas.map(({ item, quantidade }) => descreverCartaOferta(item.card, item, Number(quantidade) || 0));
  return `Você dá: ${cartas.join(", ")}.`;
}
