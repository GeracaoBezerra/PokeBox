export class AuthService {
  constructor(gateway, tokenStore, loginValidator, registerValidator) {
    this.gateway = gateway;
    this.tokenStore = tokenStore;
    this.loginValidator = loginValidator;
    this.registerValidator = registerValidator;
  }

  async login(credentials) {
    const errors = this.loginValidator.validate(credentials);
    if (Object.keys(errors).length) return { ok: false, errors };

    try {
      const { token, user } = await this.gateway.login(credentials);
      this.tokenStore.set(token);
      return { ok: true, user };
    } catch (e) {
      return { ok: false, message: e.message };
    }
  }

  async register(payload) {
    const errors = this.registerValidator.validate(payload);
    if (Object.keys(errors).length) return { ok: false, errors };

    try {
      const { token, user } = await this.gateway.register({
        name: payload.name,
        username: payload.username,
        email: payload.email,
        password: payload.password,
      });
      this.tokenStore.set(token);
      return { ok: true, user };
    } catch (e) {
      return { ok: false, message: e.message };
    }
  }
}