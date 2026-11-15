import { http } from "./http";

export async function searchCards({ name, page = 1, limit = 20, lang = "en" }) {
  const body = await http.get("/cards", { params: { name: name || undefined, page, limit, lang } });
  return { items: body.data, pagination: body.pagination };
}

export async function getCard(id, lang = "en") {
  const body = await http.get(`/cards/${encodeURIComponent(id)}`, { params: { lang } });
  return body.data;
}
