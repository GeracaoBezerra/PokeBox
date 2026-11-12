import { createCollectionRoutes } from '../routes/collection.routes.js';
import { createUsersRoutes } from '../routes/users.routes.js';
import type { AppModule, Infra } from './types.js';

export function buildCollectionModule(infra: Infra): AppModule {
  return {
    routes: [
      { path: '/collection', router: createCollectionRoutes(infra.auth) },
      { path: '/users', router: createUsersRoutes() },
    ],
  };
}
