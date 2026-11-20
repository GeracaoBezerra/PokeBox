import type { ListingStatus } from '../generated/prisma/index.js';
import type { Db } from '../lib/prisma.js';
import { pendingFirst } from '../utils/pendingFirst.js';
import { USABLE_STATUSES } from '../utils/accountStatus.js';
import type { ListingCounts } from '../utils/collectionRules.js';
import { isOpenStatus, OPEN_STATUSES } from '../utils/listingRules.js';
import { cardWhere, listingOrderBy } from '../utils/listingSearch.js';
import type { PageWindow } from '../utils/pagination.js';
import {
  listingInclude,
  type ActiveListingFilters,
  type ListingChanges,
  type ListingRef,
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
    withInTrade = false,
    skip = 0,
    take,
  }: ActiveListingFilters): Promise<ListingWithItem[]> {
    const where = (status: ListingStatus) => ({
      status,
      collectionItem: {
        cardId,
        condition,
        finish,
        firstEdition,
        card: cardWhere({ q, setId, type, rarity }),
        user: { username, deletedAt: null, accountStatus: { in: USABLE_STATUSES } },
      },
    });
    const find = (status: ListingStatus, window: { skip?: number; take?: number }) =>
      this.db.listing.findMany({ where: where(status), include: listingInclude, orderBy: listingOrderBy(sort), ...window });

    if (!withInTrade) return find('ACTIVE', { skip, take });

    return pendingFirst(
      {
        find: (active, window) => find(active ? 'ACTIVE' : 'IN_TRADE', window),
        countPending: () => this.db.listing.count({ where: where('ACTIVE') }),
      },
      { skip, take },
    );
  }

  findByOwner(userId: string, { skip, take }: Partial<PageWindow> = {}): Promise<ListingWithItem[]> {
    return this.db.listing.findMany({
      where: { collectionItem: { userId } },
      include: listingInclude,
      orderBy: [...newestFirst],
      skip,
      take,
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

  findOpenByUserAndCard(userId: string, cardId: string): Promise<ListingRef[]> {
    return this.db.listing.findMany({
      where: { status: { in: [...OPEN_STATUSES] }, collectionItem: { userId, cardId } },
      select: { id: true, status: true },
      orderBy: [...newestFirst],
    });
  }

  async closeOpenByOwner(userId: string, db: Db = this.db): Promise<number> {
    const { count } = await db.listing.updateMany({
      where: { status: { in: [...OPEN_STATUSES] }, collectionItem: { userId } },
      data: { status: 'CLOSED' },
    });
    return count;
  }
}
