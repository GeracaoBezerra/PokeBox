import { prisma } from '../lib/prisma.js';

export function withTransaction(fn) {
  return prisma.$transaction(fn);
}
