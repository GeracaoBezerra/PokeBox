import { AuthService } from "./authService";
import { Validator } from "./validator";
import { LocalUserStore } from "./localUserStore";
import { loginRules, registerRules } from "./rules";
import { HttpAuthGateway } from "./gateways/httpAuthGateway";

export function createAuthService({ http, tokenStore }) {
  return new AuthService(
    new HttpAuthGateway(http),
    tokenStore,
    new LocalUserStore(),
    new Validator(loginRules),
    new Validator(registerRules)
  );
}
