import { http } from "./http";

export async function searchCards({ name, page = 1, limit = 20, lang = "en", type, rarity, set, category, sort, order }) {
  const rankingDinamico = sort === "wanted" || sort === "traded";
  const body = await http.get("/cards", { params: {
    name: name || undefined, page, limit, lang,
    type: type || undefined, rarity: rarity || undefined,
    set: set || undefined, category: category || undefined, sort, order,
  }, ...(rankingDinamico && { headers: { "Cache-Control": "no-cache" } }) });
  return { items: body.data, pagination: body.pagination };
}

export async function getCardFilters(lang = "en") {
  const body = await http.get("/cards/filters", { params: { lang } });
  return body.data;
}

export async function getCard(id, lang = "en") {
  const body = await http.get(`/cards/${encodeURIComponent(id)}`, { params: { lang } });
  return body.data;
}
