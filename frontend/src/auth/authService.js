export class AuthService {
  constructor(gateway, tokenStore, userStore, loginValidator, registerValidator) {
    this.gateway = gateway;
    this.tokenStore = tokenStore;
    this.userStore = userStore;
    this.loginValidator = loginValidator;
    this.registerValidator = registerValidator;
    this.listeners = new Set();
    this.session = tokenStore.get() ? { user: userStore.get() } : null;
  }

  getSession = () => this.session;

  subscribe = (listener) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  logout() {
    this.tokenStore.clear();
    this.userStore.clear();
    this.setSession(null);
  }

  startSession(token, user) {
    const sessionUser = { name: user.name, username: user.username };
    this.tokenStore.set(token);
    this.userStore.set(sessionUser);
    this.setSession({ user: sessionUser });
  }

  setSession(session) {
    this.session = session;
    this.listeners.forEach((listener) => listener());
  }

  async login(credentials) {
    const errors = this.loginValidator.validate(credentials);
    if (Object.keys(errors).length) return { ok: false, errors };

    try {
      const { token, user } = await this.gateway.login(credentials);
      this.startSession(token, user);
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
      this.startSession(token, user);
      return { ok: true, user };
    } catch (e) {
      return { ok: false, message: e.message };
    }
  }
}
