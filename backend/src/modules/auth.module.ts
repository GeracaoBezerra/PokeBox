import { AuthController } from '../controllers/AuthController.js';
import { UserController } from '../controllers/UserController.js';
import { createAuthLimiter } from '../middlewares/rateLimit.js';
import { PrismaTransactionRunner } from '../repositories/PrismaTransactionRunner.js';
import { PrismaUnitOfWorkFactory } from '../repositories/PrismaUnitOfWorkFactory.js';
import { PrismaUserRepository } from '../repositories/PrismaUserRepository.js';
import { createAuthRoutes } from '../routes/auth.routes.js';
import { createUserRoutes } from '../routes/user.routes.js';
import { BcryptPasswordHasher } from '../security/PasswordHasher.js';
import { JwtTokenSigner } from '../security/TokenSigner.js';
import { AuthService } from '../services/AuthService.js';
import { UserService } from '../services/UserService.js';
import type { AppModule, Infra } from './types.js';

const SALT_ROUNDS = 12;

export function buildAuthModule(infra: Infra): AppModule {
  const users = new PrismaUserRepository(infra.prisma);
  const hasher = new BcryptPasswordHasher(SALT_ROUNDS);
  const tokens = new JwtTokenSigner(infra.env.JWT_SECRET, infra.env.JWT_EXPIRES_IN);

  const authController = new AuthController(new AuthService(users, hasher, tokens));
  const unitOfWork = new PrismaUnitOfWorkFactory(new PrismaTransactionRunner(infra.prisma));
  const userController = new UserController(new UserService(users, unitOfWork));
  const limiters = {
    login: createAuthLimiter(infra.env.AUTH_RATE_LIMIT),
    register: createAuthLimiter(infra.env.AUTH_RATE_LIMIT),
  };

  return {
    routes: [
      { path: '/auth', router: createAuthRoutes(infra.auth, authController, limiters) },
      { path: '/user', router: createUserRoutes(infra.auth, userController) },
    ],
  };
}
