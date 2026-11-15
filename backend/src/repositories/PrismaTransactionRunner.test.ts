import { jest } from '@jest/globals';

import type { PrismaClient } from '../generated/prisma/index.js';
import { PrismaTransactionRunner } from './PrismaTransactionRunner.js';

describe('PrismaTransactionRunner', () => {
  it('roda o trabalho dentro do $transaction e devolve o resultado', async () => {
    const tx = { name: 'tx' };
    const $transaction = jest.fn(async (work: (client: unknown) => Promise<unknown>) => work(tx));
    const runner = new PrismaTransactionRunner({ $transaction } as unknown as PrismaClient);

    const result = await runner.run(async (db) => ({ got: db }));

    expect($transaction).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ got: tx });
  });

  it('erro dentro do trabalho sobe para quem chamou', async () => {
    const $transaction = jest.fn(async (work: (client: unknown) => Promise<unknown>) => work({}));
    const runner = new PrismaTransactionRunner({ $transaction } as unknown as PrismaClient);

    await expect(runner.run(async () => Promise.reject(new Error('falha')))).rejects.toThrow('falha');
  });
});
