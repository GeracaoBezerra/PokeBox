import { ApiError, http } from "./http";
import { usernameValido } from "../utils/filtrosMarketplace";

export async function searchCollectors(q, page, limit, signal) {
  const { data, pagination } = await http.get("/users", {
    params: { q, page, limit },
    signal,
    timeout: 8000,
  });
  if (!Array.isArray(data?.items) || typeof pagination?.hasNextPage !== "boolean" ||
      !data.items.every((item) => typeof item?.username === "string" && usernameValido(item.username) &&
        typeof item.name === "string" && item.name.trim().length > 0)) {
    throw new ApiError(502, "Resposta inválida na busca de colecionadores.");
  }
  return { items: data.items, pagination };
}
