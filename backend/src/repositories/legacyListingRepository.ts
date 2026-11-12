import { prisma, type Db } from '../lib/prisma.js';
import type { ListingChanges, ListingWithItem, OpenListing } from './ListingRepository.js';
import { PrismaListingRepository } from './PrismaListingRepository.js';

const legacyListings = new PrismaListingRepository(prisma);

export function findById(id: string, db?: Db): Promise<ListingWithItem | null> {
  return legacyListings.findById(id, db);
}

export function findOpenByItem(collectionItemId: string, db?: Db): Promise<OpenListing[]> {
  return legacyListings.findOpenByItem(collectionItemId, db);
}

export function update(id: string, data: ListingChanges, db?: Db): Promise<ListingWithItem> {
  return legacyListings.update(id, data, db);
}
