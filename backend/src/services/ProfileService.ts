import { NotFoundError } from '../errors/domainErrors.js';
import type { CollectionItemWithCard, PublicCollectionReader } from '../repositories/CollectionRepository.js';
import type { UserRepository } from '../repositories/UserRepository.js';
import { isPublicProfileVisible } from '../utils/accountStatus.js';
import { toPublicCollectionItem, type PublicCollectionItem } from '../utils/collectionRules.js';

export type PublicProfileLookup = Pick<UserRepository, 'findPublicByUsername'>;

export interface PublicCollection {
  user: { username: string; name: string; createdAt: Date };
  items: PublicCollectionItem<CollectionItemWithCard['card']>[];
}

export class ProfileService {
  constructor(
    private readonly users: PublicProfileLookup,
    private readonly collection: PublicCollectionReader,
  ) {}

  async getPublicCollection(username: string): Promise<PublicCollection> {
    const user = await this.users.findPublicByUsername(username);
    if (!isPublicProfileVisible(user)) throw new NotFoundError('Usuário não encontrado');

    const items = await this.collection.findPublicByUser(user.id);

    return {
      user: { username: user.username, name: user.name, createdAt: user.createdAt },
      items: items.map((item) => toPublicCollectionItem(item)),
    };
  }
}
