import { NotFoundError } from '../errors/domainErrors.js';
import type {
  CollectionItemWithCard,
  PublicCollectionFilters,
  PublicCollectionReader,
} from '../repositories/CollectionRepository.js';
import type { UserRepository } from '../repositories/UserRepository.js';
import { isPublicProfileVisible } from '../utils/accountStatus.js';
import { toPublicCollectionItem, type PublicCollectionItem } from '../utils/collectionRules.js';
import { toPage, toSkipTake, type PageParams } from '../utils/pagination.js';

export type PublicProfileLookup = Pick<UserRepository, 'findPublicByUsername' | 'searchCollectors'>;

export interface PublicCollection {
  user: { username: string; name: string; createdAt: Date };
  items: PublicCollectionItem<CollectionItemWithCard['card']>[];
}

export interface PublicCollectionPage extends PublicCollection {
  hasNextPage: boolean;
}

export class ProfileService {
  constructor(
    private readonly users: PublicProfileLookup,
    private readonly collection: PublicCollectionReader,
  ) {}

  async searchCollectors(term: string, page: PageParams) {
    const rows = await this.users.searchCollectors(term, toSkipTake(page));
    return toPage(rows, page);
  }

  async getPublicCollection(username: string): Promise<PublicCollection> {
    const user = await this.findVisibleUser(username);
    const items = await this.collection.findPublicByUser(user.id);

    return {
      user: { username: user.username, name: user.name, createdAt: user.createdAt },
      items: items.map((item) => toPublicCollectionItem(item)),
    };
  }

  async getPublicCollectionPage(
    username: string,
    filters: PublicCollectionFilters,
    page: PageParams,
  ): Promise<PublicCollectionPage> {
    const user = await this.findVisibleUser(username);
    const rows = await this.collection.findPublicByUser(user.id, { ...filters, ...toSkipTake(page) });
    const { items, hasNextPage } = toPage(rows, page);

    return {
      user: { username: user.username, name: user.name, createdAt: user.createdAt },
      items: items.map((item) => toPublicCollectionItem(item)),
      hasNextPage,
    };
  }

  private async findVisibleUser(username: string) {
    const user = await this.users.findPublicByUsername(username);
    if (!isPublicProfileVisible(user)) throw new NotFoundError('Usuário não encontrado');
    return user;
  }
}
