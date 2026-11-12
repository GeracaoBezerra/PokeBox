import { AuthController } from '../controllers/AuthController.js';
import { UserController } from '../controllers/UserController.js';
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
  const userController = new UserController(new UserService(users));

  return {
    routes: [
      { path: '/auth', router: createAuthRoutes(infra.auth, authController) },
      { path: '/user', router: createUserRoutes(infra.auth, userController) },
    ],
  };
}
