export class HttpAuthGateway {
  constructor(http) {
    this.http = http;
  }

  async login({ email, password }) {
    const body = await this.http.post("/auth/login", { email, password });
    return body.data;
  }

  async register({ name, username, email, password }) {
    const body = await this.http.post("/auth/register", { name, username, email, password });
    return body.data;
  }
}
