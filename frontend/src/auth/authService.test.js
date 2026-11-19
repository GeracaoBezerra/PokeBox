import { describe, expect, it, vi } from "vitest";
import { AuthService } from "./authService";
import { loginRules, registerRules } from "./rules";
import { Validator } from "./validator";

class StoreEmMemoria {
  constructor(valor = null) {
    this.valor = valor;
  }
  get() {
    return this.valor;
  }
  set(valor) {
    this.valor = valor;
  }
  clear() {
    this.valor = null;
  }
}

function criarService({ gateway = {}, token = null, user = null } = {}) {
  const tokenStore = new StoreEmMemoria(token);
  const userStore = new StoreEmMemoria(user);
  const service = new AuthService(
    gateway,
    tokenStore,
    userStore,
    new Validator(loginRules),
    new Validator(registerRules)
  );
  return { service, tokenStore, userStore };
}

const ash = { name: "Ash Ketchum", username: "ash", email: "ash@pokebox.dev" };

describe("AuthService", () => {
  it("começa sem sessão quando não há token", () => {
    const { service } = criarService();

    expect(service.getSession()).toBeNull();
  });

  it("começa com sessão quando o tokenStore já tem token", () => {
    const { service } = criarService({ token: "token-salvo", user: { name: "Ash Ketchum", username: "ash" } });

    expect(service.getSession()).toEqual({ user: { name: "Ash Ketchum", username: "ash" } });
  });

  it("guarda o token e o usuário quando o login dá certo", async () => {
    const gateway = { login: vi.fn().mockResolvedValue({ token: "token-falso", user: ash }) };
    const { service, tokenStore, userStore } = criarService({ gateway });

    const resultado = await service.login({ email: "ash@pokebox.dev", password: "qualquer" });

    expect(resultado.ok).toBe(true);
    expect(gateway.login).toHaveBeenCalledWith({ email: "ash@pokebox.dev", password: "qualquer" });
    expect(tokenStore.get()).toBe("token-falso");
    expect(userStore.get()).toEqual({ name: "Ash Ketchum", username: "ash" });
    expect(service.getSession()).toEqual({ user: { name: "Ash Ketchum", username: "ash" } });
  });

  it("não chama a API quando o formulário é inválido", async () => {
    const gateway = { login: vi.fn() };
    const { service } = criarService({ gateway });

    const resultado = await service.login({ email: "", password: "" });

    expect(resultado.ok).toBe(false);
    expect(resultado.errors.email).toBe("Informe seu e-mail.");
    expect(gateway.login).not.toHaveBeenCalled();
  });

  it("devolve a mensagem e não cria sessão quando a API recusa o login", async () => {
    const gateway = {
      login: vi.fn().mockRejectedValue({ status: 401, message: "E-mail ou senha inválidos" }),
    };
    const { service, tokenStore } = criarService({ gateway });

    const resultado = await service.login({ email: "ash@pokebox.dev", password: "errada" });

    expect(resultado).toEqual({ ok: false, message: "E-mail ou senha inválidos" });
    expect(tokenStore.get()).toBeNull();
    expect(service.getSession()).toBeNull();
  });

  it("cria sessão e manda só os campos da API quando o cadastro é válido", async () => {
    const gateway = { register: vi.fn().mockResolvedValue({ token: "token-novo", user: ash }) };
    const { service, tokenStore } = criarService({ gateway });
    const ouvinte = vi.fn();
    service.subscribe(ouvinte);

    const resultado = await service.register({
      name: "Ash Ketchum",
      username: "ash",
      email: "ash@pokebox.dev",
      password: "senha-forte",
      confirmPassword: "senha-forte",
    });

    expect(resultado.ok).toBe(true);
    expect(gateway.register).toHaveBeenCalledWith({
      name: "Ash Ketchum",
      username: "ash",
      email: "ash@pokebox.dev",
      password: "senha-forte",
    });
    expect(tokenStore.get()).toBe("token-novo");
    expect(service.getSession()).toEqual({ user: { name: "Ash Ketchum", username: "ash" } });
    expect(ouvinte).toHaveBeenCalledTimes(1);
  });

  it("não chama a API quando o cadastro é inválido", async () => {
    const gateway = { register: vi.fn() };
    const { service } = criarService({ gateway });

    const resultado = await service.register({ name: "Ash Ketchum" });

    expect(resultado.ok).toBe(false);
    expect(resultado.errors.username).toBe("Escolha um nome de usuário.");
    expect(gateway.register).not.toHaveBeenCalled();
  });

  it("logout limpa os stores e avisa quem está inscrito", () => {
    const { service, tokenStore, userStore } = criarService({
      token: "token-falso",
      user: { name: "Ash Ketchum", username: "ash" },
    });
    const ouvinte = vi.fn();
    service.subscribe(ouvinte);

    service.logout();

    expect(tokenStore.get()).toBeNull();
    expect(userStore.get()).toBeNull();
    expect(service.getSession()).toBeNull();
    expect(ouvinte).toHaveBeenCalledTimes(1);
  });

  it("para de avisar depois que o ouvinte cancela a inscrição", () => {
    const { service } = criarService({ token: "token-falso" });
    const ouvinte = vi.fn();
    const cancelar = service.subscribe(ouvinte);

    cancelar();
    service.logout();

    expect(ouvinte).not.toHaveBeenCalled();
  });
});
