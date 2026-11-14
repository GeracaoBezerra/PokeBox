import type { PrismaClient } from '../generated/prisma/index.js';
import type { Db } from '../lib/prisma.js';
import type { TransactionRunner } from './TransactionRunner.js';

export class PrismaTransactionRunner implements TransactionRunner {
  constructor(private readonly prisma: PrismaClient) {}

  run<T>(work: (tx: Db) => Promise<T>): Promise<T> {
    return this.prisma.$transaction((tx) => work(tx));
  }
}
