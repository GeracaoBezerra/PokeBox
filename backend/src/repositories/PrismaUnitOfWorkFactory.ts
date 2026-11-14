import type { Db } from '../lib/prisma.js';
import { ListingChangeApplier } from '../services/ListingChangeApplier.js';
import { PrismaCollectionRepository } from './PrismaCollectionRepository.js';
import { PrismaListingRepository } from './PrismaListingRepository.js';
import { PrismaOfferRepository } from './PrismaOfferRepository.js';
import { PrismaTradeRepository } from './PrismaTradeRepository.js';
import { PrismaWishlistRepository } from './PrismaWishlistRepository.js';
import type { TransactionRunner } from './TransactionRunner.js';
import type { TradeUnitOfWork, UnitOfWorkFactory } from './UnitOfWork.js';

export type TradeUnitOfWorkBuilder = (tx: Db) => TradeUnitOfWork;

export function buildPrismaTradeUnitOfWork(tx: Db): TradeUnitOfWork {
  const collection = new PrismaCollectionRepository(tx);
  const listings = new PrismaListingRepository(tx);
  const offers = new PrismaOfferRepository(tx);

  return {
    collection,
    listings,
    offers,
    trades: new PrismaTradeRepository(tx),
    wishlist: new PrismaWishlistRepository(tx),
    listingChanges: new ListingChangeApplier(listings, offers),
    lockItemsInOrder: (ids) => collection.lockInOrder(ids),
  };
}

export class PrismaUnitOfWorkFactory implements UnitOfWorkFactory {
  constructor(
    private readonly transactions: TransactionRunner,
    private readonly build: TradeUnitOfWorkBuilder = buildPrismaTradeUnitOfWork,
  ) {}

  run<T>(work: (uow: TradeUnitOfWork) => Promise<T>): Promise<T> {
    return this.transactions.run((tx) => work(this.build(tx)));
  }
}
