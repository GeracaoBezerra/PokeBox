export class MockAuthGateway {
  async login({ email, password }) {
    await new Promise((r) => setTimeout(r, 900));
    if (email === "ash@pallet.town" && password === "pikachu123")
      return { token: "mock-token-123", user: { id: 1, name: "Ash" } };
    throw new Error("E-mail ou senha incorretos. (mock: ash@pallet.town / pikachu123)");
  }
}
