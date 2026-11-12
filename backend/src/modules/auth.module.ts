import { createAuthRoutes } from '../routes/auth.routes.js';
import { createUserRoutes } from '../routes/user.routes.js';
import type { AppModule, Infra } from './types.js';

export function buildAuthModule(infra: Infra): AppModule {
  return {
    routes: [
      { path: '/auth', router: createAuthRoutes(infra.auth) },
      { path: '/user', router: createUserRoutes(infra.auth) },
    ],
  };
}
