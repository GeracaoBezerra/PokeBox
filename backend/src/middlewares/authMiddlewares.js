import jwt from 'jsonwebtoken';

import * as userRepository from '../repositories/user.repository.js';
import { isAccountUsable } from '../utils/accountStatus.js';
import { AppError } from '../utils/AppError.js';

function extractBearerToken(authorizationHeader) {
  if (!authorizationHeader) return null;

  const [scheme, token] = authorizationHeader.split(' ');

  if (scheme !== 'Bearer' || !token) return null;

  return token;
}

export async function requireAuth(req, res, next) {
  const token = extractBearerToken(req.headers.authorization);

  if (!token) {
    throw new AppError(401, 'Token de autenticação ausente');
  }

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    throw new AppError(401, 'Token inválido ou expirado');
  }

  const user = await userRepository.findById(payload.sub);

  if (!user || !isAccountUsable(user.accountStatus)) {
    throw new AppError(401, 'Sessão inválida');
  }

  req.user = user;

  return next();
}

export function requireRole(...allowedRoles) {
  return function roleGuard(req, res, next) {
    if (!req.user) {
      throw new AppError(401, 'Autenticação necessária');
    }

    if (!allowedRoles.includes(req.user.role)) {
      throw new AppError(403, 'Você não tem permissão para esta ação');
    }

    return next();
  };
}
