import type { Db } from '../lib/prisma.js';

export interface TransactionRunner {
  run<T>(work: (tx: Db) => Promise<T>): Promise<T>;
}
