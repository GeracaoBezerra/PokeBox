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

export function cartasDaBusca(daColecao, daPesquisa, busca) {
  if (!busca.trim()) return daColecao;
  return unirPorId(filtrarPorNome(daColecao, busca), filtrarPorNome(daPesquisa, busca));
}

export function quantidadeValida(quantidade, disponivel) {
  const texto = String(quantidade ?? "").trim();
  if (!/^\d+$/.test(texto)) return false;
  const numero = Number(texto);
  return numero >= 1 && numero <= disponivel;
}

export function quantidadesInvalidas(escolhidas) {
  return escolhidas.filter(({ item, quantidade }) => !quantidadeValida(quantidade, item.available)).map(({ item }) => item);
}

export function textoQuantidadesInvalidas(itens) {
  if (itens.length === 0) return "";
  const cartas = itens.map((item) => `${item.card.name} (de 1 a ${item.available})`);
  const lista = cartas.length === 1 ? cartas[0] : `${cartas.slice(0, -1).join(", ")} e ${cartas.at(-1)}`;
  return `Corrija a quantidade oferecida de ${lista} antes de enviar.`;
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
