import type { Db } from '../lib/prisma.js';
import { USABLE_STATUSES } from '../utils/accountStatus.js';
import type { ListingCounts } from '../utils/collectionRules.js';
import { isOpenStatus, OPEN_STATUSES } from '../utils/listingRules.js';
import { cardWhere, listingOrderBy } from '../utils/listingSearch.js';
import {
  listingInclude,
  type ActiveListingFilters,
  type ListingChanges,
  type ListingRepository,
  type ListingWithItem,
  type NewListing,
  type OpenListing,
} from './ListingRepository.js';

const newestFirst = [{ createdAt: 'desc' }, { id: 'asc' }] as const;

export class PrismaListingRepository implements ListingRepository {
  constructor(private readonly db: Db) {}

  findActive({
    cardId,
    username,
    q,
    condition,
    finish,
    firstEdition,
    setId,
    type,
    rarity,
    sort,
    skip = 0,
    take,
  }: ActiveListingFilters): Promise<ListingWithItem[]> {
    return this.db.listing.findMany({
      where: {
        status: 'ACTIVE',
        collectionItem: {
          cardId,
          condition,
          finish,
          firstEdition,
          card: cardWhere({ q, setId, type, rarity }),
          user: { username, deletedAt: null, accountStatus: { in: USABLE_STATUSES } },
        },
      },
      include: listingInclude,
      orderBy: listingOrderBy(sort),
      skip,
      take,
    });
  }

  findByOwner(userId: string): Promise<ListingWithItem[]> {
    return this.db.listing.findMany({
      where: { collectionItem: { userId } },
      include: listingInclude,
      orderBy: [...newestFirst],
    });
  }

  findById(id: string, db: Db = this.db): Promise<ListingWithItem | null> {
    return db.listing.findUnique({ where: { id }, include: listingInclude });
  }

  findOpenByItem(collectionItemId: string, db: Db = this.db): Promise<OpenListing[]> {
    return db.listing.findMany({
      where: { collectionItemId, status: { in: [...OPEN_STATUSES] } },
      select: { id: true, quantity: true, status: true },
      orderBy: [...newestFirst],
    });
  }

  async sumOpenByItem(collectionItemId: string, db: Db = this.db, exceptId?: string): Promise<number> {
    const result = await db.listing.aggregate({
      where: {
        collectionItemId,
        status: { in: [...OPEN_STATUSES] },
        id: exceptId ? { not: exceptId } : undefined,
      },
      _sum: { quantity: true },
    });

    return result._sum.quantity ?? 0;
  }

  async countByItem(collectionItemId: string, db: Db = this.db): Promise<ListingCounts> {
    const groups = await db.listing.groupBy({
      by: ['status'],
      where: { collectionItemId },
      _count: { _all: true },
    });

    return groups.reduce(
      (counts, group) => ({
        open: counts.open + (isOpenStatus(group.status) ? group._count._all : 0),
        total: counts.total + group._count._all,
      }),
      { open: 0, total: 0 },
    );
  }

  create(data: NewListing, db: Db = this.db): Promise<ListingWithItem> {
    return db.listing.create({ data, include: listingInclude });
  }

  update(id: string, data: ListingChanges, db: Db = this.db): Promise<ListingWithItem> {
    return db.listing.update({ where: { id }, data, include: listingInclude });
  }

  existsActiveByUserAndCard(userId: string, cardId: string): Promise<{ id: string } | null> {
    return this.db.listing.findFirst({
      where: { status: 'ACTIVE', collectionItem: { userId, cardId } },
      select: { id: true },
    });
  }
}
