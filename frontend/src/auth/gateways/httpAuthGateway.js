export class HttpAuthGateway {
  constructor(baseUrl, fetchFn = fetch.bind(window)) {
    this.baseUrl = baseUrl;
    this.fetch = fetchFn;
  }

  async login({ email, password }) {
    let res;
    try {
      res = await this.fetch(`${this.baseUrl}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
    } catch {
      throw new Error("Não foi possível conectar ao servidor. Tente novamente.");
    }

    const body = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(
        body.details?.[0]?.message || body.error || "Não foi possível entrar."
      );
    }

    return body.data; // { user, token }
  }

  async register({ name, username, email, password }) {
    let res;
    try {
      res = await this.fetch(`${this.baseUrl}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, username, email, password }),
      });
    } catch {
      throw new Error("Não foi possível conectar ao servidor. Tente novamente.");
    }

    const body = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(
        body.details?.[0]?.message ||
          body.error ||
          "Não foi possível criar a conta."
      );
    }

    return body.data; // { user, token }
  }
}