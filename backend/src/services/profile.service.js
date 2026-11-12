import * as collectionRepository from '../repositories/collectionRepository.js';
import { prisma } from '../lib/prisma.js';
import { PrismaUserRepository } from '../repositories/PrismaUserRepository.js';
import { AppError } from '../errors/AppError.js';
import { isPublicProfileVisible } from '../utils/accountStatus.js';
import { toPublicCollectionItem } from '../utils/collectionRules.js';

const userRepository = new PrismaUserRepository(prisma);

export async function getPublicCollection(username) {
  const user = await userRepository.findPublicByUsername(username);
  if (!isPublicProfileVisible(user)) throw new AppError(404, 'Usuário não encontrado');

  const items = await collectionRepository.findPublicByUser(user.id);

  return {
    user: { username: user.username, name: user.name, createdAt: user.createdAt },
    items: items.map(toPublicCollectionItem),
  };
}
