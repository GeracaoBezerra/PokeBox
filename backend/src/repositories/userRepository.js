// backend/src/repositories/userRepository.js
import { prisma } from '../lib/prisma.js';

const publicFields = {
  id: true,
  username: true,
  name: true,
  email: true,
  role: true,
  accountStatus: true,
  createdAt: true,
};

const profileFields = {
  ...publicFields,
  phone: true,
  cep: true,
  street: true,
  number: true,
  complement: true,
  neighborhood: true,
  city: true,
  state: true,
};

export function findByEmail(email) {
  return prisma.user.findUnique({
    where: { email },
    select: { ...publicFields, passwordHash: true },
  });
}

export function findByEmailOrUsername(email, username) {
  return prisma.user.findFirst({
    where: { OR: [{ email }, { username }] },
    select: { id: true, email: true, username: true },
  });
}

export function findById(id) {
  return prisma.user.findUnique({
    where: { id },
    select: profileFields,
  });
}

export function create(data) {
  return prisma.user.create({
    data,
    select: publicFields,
  });
}

export function update(id, data) {
  return prisma.user.update({
    where: { id },
    data,
    select: profileFields,
  });
}

// "Delete" é soft delete: só muda o status, o registro continua no banco
export function deactivate(id) {
  return prisma.user.update({
    where: { id },
    data: { accountStatus: 'INACTIVE' },
    select: { id: true },
  });
}

export function touchLastLogin(id) {
  return prisma.user.update({
    where: { id },
    data: { lastLoginAt: new Date() },
    select: { id: true },
  });
}