import { CONFIG } from "../config";
import { AuthService } from "./authService";
import { Validator } from "./validator";
import { LocalTokenStore } from "./localTokenStore";
import { loginRules, registerRules } from "./rules";
import { HttpAuthGateway } from "./gateways/httpAuthGateway";

export function createAuthService() {
  const gateway = new HttpAuthGateway(CONFIG.apiBaseUrl);
  const tokenStore = new LocalTokenStore();

  return new AuthService(
    gateway,
    tokenStore,
    new Validator(loginRules),
    new Validator(registerRules)
  );
}