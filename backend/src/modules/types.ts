import type { Router } from 'express';

import type { Env } from '../config/env.js';
import type { PrismaClient } from '../generated/prisma/index.js';
import type { Logger } from '../lib/logger.js';
import type { AuthMiddleware } from '../middlewares/AuthMiddleware.js';

export interface Infra {
  env: Env;
  prisma: PrismaClient;
  auth: AuthMiddleware;
  logger: Logger;
}

export interface RouteMount {
  path: string;
  router: Router;
}

export interface AppModule {
  routes: RouteMount[];
}
