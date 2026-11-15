import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';

import { AppError } from '../errors/AppError.js';
import type {} from '../types/express.js';
import type { AuthUser, Role } from '../types/auth.js';
import { isAccountUsable } from '../utils/accountStatus.js';

export interface UserLookup {
  findById(id: string): Promise<AuthUser | null>;
}

export interface AuthMiddlewareDeps {
  users: UserLookup;
  jwtSecret: string;
}

function extractBearerToken(authorizationHeader: string | undefined): string | null {
  if (!authorizationHeader) return null;

  const [scheme, token] = authorizationHeader.split(' ');

  if (scheme !== 'Bearer' || !token) return null;

  return token;
}

export class AuthMiddleware {
  private readonly users: UserLookup;
  private readonly jwtSecret: string;

  constructor({ users, jwtSecret }: AuthMiddlewareDeps) {
    this.users = users;
    this.jwtSecret = jwtSecret;
  }

  readonly requireAuth: RequestHandler = async (req, _res, next) => {
    try {
      const token = extractBearerToken(req.headers.authorization);
      if (!token) throw new AppError(401, 'Token de autenticação ausente');

      const userId = this.verifyToken(token);

      const user = await this.users.findById(userId);
      if (!user || !isAccountUsable(user.accountStatus)) {
        throw new AppError(401, 'Sessão inválida');
      }

      req.user = user;
      next();
    } catch (error) {
      next(error);
    }
  };

  readonly optionalAuth: RequestHandler = (req, res, next) => {
    if (!req.headers.authorization) return next();
    return this.requireAuth(req, res, next);
  };

  requireRole(...allowedRoles: Role[]): RequestHandler {
    return (req, _res, next) => {
      if (!req.user) {
        throw new AppError(401, 'Autenticação necessária');
      }

      if (!allowedRoles.includes(req.user.role)) {
        throw new AppError(403, 'Você não tem permissão para esta ação');
      }

      return next();
    };
  }

  private verifyToken(token: string): string {
    try {
      const payload = jwt.verify(token, this.jwtSecret, { algorithms: ['HS256'] });
      if (typeof payload === 'string' || typeof payload.sub !== 'string') throw new Error('payload sem sub');
      return payload.sub;
    } catch {
      throw new AppError(401, 'Token inválido ou expirado');
    }
  }
}
