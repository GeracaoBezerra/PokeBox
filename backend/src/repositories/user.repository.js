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
    select: publicFields,
  });
}

export function create(data) {
  return prisma.user.create({
    data,
    select: publicFields,
  });
}

export function touchLastLogin(id) {
  return prisma.user.update({
    where: { id },
    data: { lastLoginAt: new Date() },
    select: { id: true },
  });
}
