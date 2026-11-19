import { describe, expect, it, vi } from "vitest";
import { ApiError } from "../api/http";
import { IDIOMAS, IDIOMA_PADRAO, buscarComReserva, linkBuscaNaReserva } from "./idioma";

describe("IDIOMAS", () => {
  it("começa pelo idioma padrão, que é o português", () => {
    expect(IDIOMA_PADRAO).toBe("pt");
    expect(Object.keys(IDIOMAS)[0]).toBe("pt");
  });
});

describe("buscarComReserva", () => {
  it("usa o idioma pedido sem tentar outro", async () => {
    const buscar = vi.fn().mockResolvedValue("carta");
    expect(await buscarComReserva(buscar, "ja")).toEqual({ dados: "carta", lang: "ja", reserva: false });
    expect(buscar).toHaveBeenCalledTimes(1);
    expect(buscar).toHaveBeenCalledWith("ja");
  });

  it("não cai para o inglês quando o idioma foi pedido e deu 404", async () => {
    const buscar = vi.fn().mockRejectedValue(new ApiError(404, "não encontrada"));
    await expect(buscarComReserva(buscar, "pt")).rejects.toMatchObject({ status: 404 });
    expect(buscar).toHaveBeenCalledTimes(1);
  });

  it("sem idioma pedido, tenta o português primeiro", async () => {
    const buscar = vi.fn().mockResolvedValue("carta pt");
    expect(await buscarComReserva(buscar)).toEqual({ dados: "carta pt", lang: "pt", reserva: false });
    expect(buscar).toHaveBeenCalledWith("pt");
  });

  it("sem idioma pedido, cai para o inglês quando o português dá 404", async () => {
    const buscar = vi.fn((lang) => (lang === "pt" ? Promise.reject(new ApiError(404, "x")) : Promise.resolve("carta en")));
    expect(await buscarComReserva(buscar)).toEqual({ dados: "carta en", lang: "en", reserva: true });
    expect(buscar).toHaveBeenCalledTimes(2);
  });

  it("outros erros não caem para o inglês", async () => {
    const buscar = vi.fn().mockRejectedValue(new ApiError(500, "fora do ar"));
    await expect(buscarComReserva(buscar)).rejects.toMatchObject({ status: 500 });
    expect(buscar).toHaveBeenCalledTimes(1);
  });
});

describe("linkBuscaNaReserva", () => {
  it("leva ao catálogo em inglês com a mesma busca", () => {
    expect(linkBuscaNaReserva("dark charizard")).toBe("/catalogo?name=dark+charizard&lang=en");
  });
});
