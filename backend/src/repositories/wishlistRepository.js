import { prisma } from '../lib/prisma.js';

export function findManyByUser(userId) {
  return prisma.wishlistItem.findMany({
    where: { userId },
    include: { card: true },
    orderBy: [{ card: { name: 'asc' } }, { createdAt: 'asc' }],
  });
}

export function findById(id) {
  return prisma.wishlistItem.findUnique({ where: { id } });
}

export function create({ userId, cardId }) {
  return prisma.wishlistItem.create({
    data: { userId, cardId },
    include: { card: true },
  });
}

export function remove(id) {
  return prisma.wishlistItem.delete({
    where: { id },
    select: { id: true },
  });
}
