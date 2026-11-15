import { http } from "./http";

export async function listCollection() {
  const body = await http.get("/collection");
  return body.data.items;
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

export async function getPublicCollection(username) {
  const body = await http.get(`/users/${encodeURIComponent(username)}/collection`);
  return body.data;
}
