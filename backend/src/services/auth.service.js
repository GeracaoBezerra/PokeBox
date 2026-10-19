// backend/src/services/auth.service.js
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

import * as userRepository from '../repositories/userRepository.js';
import { isAccountUsable } from '../utils/accountStatus.js';
import { AppError } from '../utils/AppError.js';

const SALT_ROUNDS = 12;
const INVALID_CREDENTIALS = 'E-mail ou senha inválidos';
const DUMMY_HASH = bcrypt.hashSync('dummy-password', SALT_ROUNDS);

function signToken(user) {
  return jwt.sign(
    { sub: user.id },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN ?? '1d' },
  );
}

export async function register({ username, name, email, password }) {
  const alreadyExists = await userRepository.findByEmailOrUsername(email, username);

  if (alreadyExists) {
    throw new AppError(409, 'E-mail ou username já cadastrado');
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const user = await userRepository.create({ username, name, email, passwordHash });

  return { user, token: signToken(user) };
}

export async function login({ email, password }) {
  const user = await userRepository.findByEmail(email);
  const passwordMatches = await bcrypt.compare(
    password,
    user?.passwordHash ?? DUMMY_HASH,
  );

  if (!user || !passwordMatches) {
    throw new AppError(401, INVALID_CREDENTIALS);
  }

  if (!isAccountUsable(user.accountStatus)) {
    throw new AppError(403, 'Conta indisponível. Procure o suporte.');
  }

  await userRepository.touchLastLogin(user.id);

  const { passwordHash, ...safeUser } = user;

  return { user: safeUser, token: signToken(safeUser) };
}
