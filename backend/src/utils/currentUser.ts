import type { Request } from 'express';

import { AppError } from '../errors/AppError.js';
import type {} from '../types/express.js';
import type { AuthUser } from '../types/auth.js';

export function currentUser(req: Request): AuthUser {
  if (!req.user) throw new AppError(401, 'Autenticação necessária');
  return req.user;
}
