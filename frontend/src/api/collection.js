import { http } from "./http";
import { parametrosDaPagina } from "./parametros";

export async function listCollection(opcoes) {
  if (!opcoes) {
    const body = await http.get("/collection");
    return body.data.items;
  }
  const body = await http.get("/collection", { params: parametrosDaPagina(opcoes) });
  return { items: body.data.items, pagination: body.pagination };
}

export async function getCollectionSummary() {
  const body = await http.get("/collection/summary");
  return body.data;
}

export async function addToCollection(data) {
  const body = await http.post("/collection", data);
  return body.data;
}

export async function updateCollectionItem(id, data) {
  const body = await http.patch(`/collection/${id}`, data);
  return body.data.item;
}

export async function removeCollectionItem(id) {
  await http.delete(`/collection/${id}`);
}

export async function getPublicCollection(username, opcoes) {
  const caminho = `/users/${encodeURIComponent(username)}/collection`;
  if (!opcoes) {
    const body = await http.get(caminho);
    return body.data;
  }
  const body = await http.get(caminho, { params: parametrosDaPagina(opcoes) });
  return { user: body.data.user, items: body.data.items, pagination: body.pagination };
}
