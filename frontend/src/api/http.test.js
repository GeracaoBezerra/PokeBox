import { http as rota, HttpResponse } from "msw";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CONFIG } from "../config";
import { server } from "../test/server";
import { ApiError, configurarHttp, http } from "./http";

const url = (caminho) => `${CONFIG.apiBaseUrl}${caminho}`;

function configurar(token) {
  const aoExpirarSessao = vi.fn();
  configurarHttp({ tokenStore: { get: () => token }, aoExpirarSessao });
  return aoExpirarSessao;
}

afterEach(() => configurarHttp({ tokenStore: null, aoExpirarSessao: () => {} }));

describe("http", () => {
  it("manda o token do tokenStore no header e devolve o corpo", async () => {
    configurar("token-falso");
    server.use(
      rota.get(url("/collection"), ({ request }) =>
        HttpResponse.json({ success: true, data: { auth: request.headers.get("authorization") } })
      )
    );

    const corpo = await http.get("/collection");

    expect(corpo).toEqual({ success: true, data: { auth: "Bearer token-falso" } });
  });

  it("transforma o erro da API em ApiError com status, mensagem e details", async () => {
    configurar(null);
    const details = [{ field: "quantity", message: "Pelo menos 1" }];
    server.use(
      rota.post(url("/collection"), () => HttpResponse.json({ success: false, error: "Dados inválidos", details }, { status: 400 }))
    );

    const erro = await http.post("/collection", {}).catch((e) => e);

    expect(erro).toBeInstanceOf(ApiError);
    expect(erro).toMatchObject({ status: 400, message: "Pelo menos 1", details });
  });

  it("não inventa mensagem quando a API não manda texto", async () => {
    configurar(null);
    server.use(rota.get(url("/collection"), () => new HttpResponse(null, { status: 500 })));

    const erro = await http.get("/collection").catch((e) => e);

    expect(erro).toMatchObject({ status: 500, message: "" });
  });

  it("avisa que a sessão expirou no 401 de uma rota protegida com token", async () => {
    const aoExpirarSessao = configurar("token-vencido");
    server.use(rota.get(url("/collection"), () => HttpResponse.json({ success: false, error: "Token inválido" }, { status: 401 })));

    await http.get("/collection").catch(() => {});

    expect(aoExpirarSessao).toHaveBeenCalledTimes(1);
  });

  it("não trata senha errada no login como sessão expirada", async () => {
    const aoExpirarSessao = configurar("token-antigo");
    server.use(
      rota.post(url("/auth/login"), () => HttpResponse.json({ success: false, error: "E-mail ou senha inválidos" }, { status: 401 }))
    );

    const erro = await http.post("/auth/login", {}).catch((e) => e);

    expect(erro.message).toBe("E-mail ou senha inválidos");
    expect(aoExpirarSessao).not.toHaveBeenCalled();
  });

  it("sem token, o 401 não conta como sessão expirada", async () => {
    const aoExpirarSessao = configurar(null);
    server.use(rota.get(url("/collection"), () => HttpResponse.json({ success: false, error: "Token ausente" }, { status: 401 })));

    await http.get("/collection").catch(() => {});

    expect(aoExpirarSessao).not.toHaveBeenCalled();
  });
});
