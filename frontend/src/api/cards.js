import { http } from "./http";
import { IDIOMA_PADRAO } from "../utils/idioma";

export async function searchCards({ name, page = 1, limit = 20, lang = IDIOMA_PADRAO, type, rarity, set, category, sort, order }) {
  const body = await http.get("/cards", { params: {
    name: name || undefined, page, limit, lang,
    type: type || undefined, rarity: rarity || undefined,
    set: set || undefined, category: category || undefined, sort, order,
  } });
  return { items: body.data, pagination: body.pagination, search: body.search ?? null };
}

export async function getCardFilters(lang = IDIOMA_PADRAO) {
  const body = await http.get("/cards/filters", { params: { lang } });
  return body.data;
}

export async function getCard(id, lang = IDIOMA_PADRAO) {
  const body = await http.get(`/cards/${encodeURIComponent(id)}`, { params: { lang } });
  return body.data;
}
