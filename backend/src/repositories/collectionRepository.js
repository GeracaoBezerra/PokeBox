import { prisma } from '../lib/prisma.js';

export function findManyByUser(userId) {
  return prisma.collectionItem.findMany({
    where: { userId },
    include: { card: true },
    orderBy: [{ card: { name: 'asc' } }, { createdAt: 'asc' }],
  });
}

export function findPublicByUser(userId) {
  return prisma.collectionItem.findMany({
    where: { userId, isPublic: true, quantity: { gt: 0 } },
    include: { card: true },
    orderBy: [{ card: { name: 'asc' } }, { createdAt: 'asc' }],
  });
}

export function findById(id) {
  return prisma.collectionItem.findUnique({
    where: { id },
    include: { card: true },
  });
}

export function addOrIncrement({ userId, cardId, condition, finish, firstEdition, quantity, isPublic }) {
  return prisma.collectionItem.upsert({
    where: {
      userId_cardId_condition_finish_firstEdition: {
        userId,
        cardId,
        condition: condition ?? 'NEAR_MINT',
        finish,
        firstEdition,
      },
    },
    create: { userId, cardId, condition, finish, firstEdition, quantity, isPublic },
    update: { quantity: { increment: quantity } },
    include: { card: true },
  });
}

export function update(id, data) {
  return prisma.collectionItem.update({
    where: { id },
    data,
    include: { card: true },
  });
}

export function remove(id) {
  return prisma.collectionItem.delete({
    where: { id },
    select: { id: true },
  });
}

export function findOwnersOfCards(cardIds, userId) {
  return prisma.collectionItem.groupBy({
    by: ['cardId', 'userId'],
    where: {
      cardId: { in: cardIds },
      userId: { not: userId },
      isPublic: true,
      quantity: { gt: prisma.collectionItem.fields.reservedQuantity },
    },
  });
}
