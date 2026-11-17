import { TcgdexUnavailableError } from '../errors/TcgdexUnavailableError.js';
import type { Logger } from '../lib/logger.js';
import type { MemoryCache } from '../utils/memoryCache.js';

export async function orStale<T>(
  memory: MemoryCache<T>,
  key: string,
  logger: Logger,
  load: () => Promise<T>,
): Promise<T> {
  try {
    return await load();
  } catch (err) {
    const stale = memory.getStale(key);
    if (!(err instanceof TcgdexUnavailableError) || stale === null) throw err;
    logger.warn({ err: err.message, key }, 'TCGdex fora, usando o resultado guardado');
    return stale;
  }
}
