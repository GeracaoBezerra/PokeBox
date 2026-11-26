import { ApiError, http } from "./http";

export async function searchCollectors(q, page, limit, signal) {
  const { data, pagination } = await http.get("/users", {
    params: { q, page, limit },
    signal,
    timeout: 8000,
  });
  if (!Array.isArray(data?.items) || typeof pagination?.hasNextPage !== "boolean" ||
      !data.items.every((item) => typeof item?.username === "string" && typeof item.name === "string")) {
    throw new ApiError(502, "Resposta inválida na busca de colecionadores.");
  }
  return { items: data.items, pagination };
}
