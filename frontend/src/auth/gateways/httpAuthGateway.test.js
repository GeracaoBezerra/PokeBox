import { describe, expect, it, vi } from "vitest";
import { HttpAuthGateway } from "./httpAuthGateway";

const sessao = { token: "token-falso", user: { name: "Ash Ketchum", username: "ash" } };

describe("HttpAuthGateway", () => {
  it("login manda só e-mail e senha e devolve o data da resposta", async () => {
    const http = { post: vi.fn().mockResolvedValue({ success: true, data: sessao }) };
    const gateway = new HttpAuthGateway(http);

    const resultado = await gateway.login({ email: "ash@pokebox.dev", password: "segredo", extra: "x" });

    expect(http.post).toHaveBeenCalledWith("/auth/login", { email: "ash@pokebox.dev", password: "segredo" });
    expect(resultado).toEqual(sessao);
  });

  it("register manda os quatro campos da API", async () => {
    const http = { post: vi.fn().mockResolvedValue({ success: true, data: sessao }) };
    const gateway = new HttpAuthGateway(http);

    await gateway.register({ name: "Ash", username: "ash", email: "ash@pokebox.dev", password: "segredo", confirmPassword: "segredo" });

    expect(http.post).toHaveBeenCalledWith("/auth/register", {
      name: "Ash",
      username: "ash",
      email: "ash@pokebox.dev",
      password: "segredo",
    });
  });

  it("deixa o erro do http subir para o AuthService tratar", async () => {
    const erro = { status: 401, message: "E-mail ou senha inválidos" };
    const gateway = new HttpAuthGateway({ post: vi.fn().mockRejectedValue(erro) });

    await expect(gateway.login({ email: "ash@pokebox.dev", password: "errada" })).rejects.toBe(erro);
  });
});
