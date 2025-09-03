import { getValkeyClient } from "./valkey";
import { getRequestEvent } from "$app/server";

export interface CacheOptions {
  ttl?: number;
  keyPrefix?: string;
  bypassCache?: boolean;
}

const DEFAULT_TTL = 300;
const DEFAULT_KEY_PREFIX = "query";

function getCacheKey(
  prefix: string,
  userId: string,
  functionName: string,
  args?: any
): string {
  const argsHash = args ? JSON.stringify(args) : "no-args";
  return `${prefix}:${userId}:${functionName}:${argsHash}`;
}

export async function withCache<T>(
  functionName: string,
  queryFn: () => Promise<T>,
  options: CacheOptions = {}
): Promise<T> {
  const redis = getValkeyClient();

  if (!redis || options.bypassCache) {
    return queryFn();
  }

  try {
    const { locals } = getRequestEvent();
    const userId = locals.user?.id;

    if (!userId) {
      return queryFn();
    }

    const ttl = options.ttl ?? DEFAULT_TTL;
    const keyPrefix = options.keyPrefix ?? DEFAULT_KEY_PREFIX;
    const cacheKey = getCacheKey(keyPrefix, userId, functionName);

    const cached = await redis.get(cacheKey);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (error) {
        console.warn(
          "Failed to parse cached data, fetching fresh data:",
          error
        );
      }
    }

    const result = await queryFn();

    try {
      await redis.setex(cacheKey, ttl, JSON.stringify(result));
    } catch (error) {
      console.warn("Failed to cache query result:", error);
    }

    return result;
  } catch (error) {
    console.warn("Cache operation failed, executing query directly:", error);
    return queryFn();
  }
}

export async function invalidateCache(
  patterns: string | string[],
  options: { keyPrefix?: string } = {}
): Promise<void> {
  const redis = getValkeyClient();
  if (!redis) return;

  try {
    const { locals } = getRequestEvent();
    const userId = locals.user?.id;
    if (!userId) return;

    const keyPrefix = options.keyPrefix ?? DEFAULT_KEY_PREFIX;
    const patternsArray = Array.isArray(patterns) ? patterns : [patterns];

    for (const pattern of patternsArray) {
      const searchPattern = `${keyPrefix}:${userId}:${pattern}*`;
      const keys = await redis.keys(searchPattern);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    }
  } catch (error) {
    console.warn("Failed to invalidate cache:", error);
  }
}
