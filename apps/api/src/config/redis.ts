// Redis client via Upstash REST API (used for token blacklisting / caching)
import { Redis } from '@upstash/redis';

let redisClient: Redis | null = null;

export function getRedisClient(): Redis {
  if (!redisClient) {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!url || !token) throw new Error('Upstash Redis env vars are not defined');
    redisClient = new Redis({ url, token });
  }
  return redisClient;
}
