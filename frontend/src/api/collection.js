import { http } from "./http";
import { semVazios } from "./parametros";

export async function listCollection(opcoes) {
  if (!opcoes) {
    const body = await http.get("/collection");
    return body.data.items;
  }
  const { page = 1, limit = 20, ...filtros } = opcoes;
  const body = await http.get("/collection", { params: { ...semVazios(filtros), page, limit } });
  return { items: body.data.items, pagination: body.pagination };
}

export async function addToCollection(data) {
  const body = await http.post("/collection", data);
  return body.data.item;
}

export async function updateCollectionItem(id, data) {
  const body = await http.patch(`/collection/${id}`, data);
  return body.data.item;
}

export async function removeCollectionItem(id) {
  await http.delete(`/collection/${id}`);
}

export async function getPublicCollection(username, opcoes) {
  const rota = `/users/${encodeURIComponent(username)}/collection`;
  if (!opcoes) {
    const body = await http.get(rota);
    return body.data;
  }
  const { page = 1, limit = 20, ...filtros } = opcoes;
  const body = await http.get(rota, { params: { ...semVazios(filtros), page, limit } });
  return { user: body.data.user, items: body.data.items, pagination: body.pagination };
}
