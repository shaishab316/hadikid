import type { Env } from '@/common/config/app.config';
import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { CACHE_KEY } from './redis.constant';

type Ctx = typeof CACHE_KEY;

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client!: Redis;
  private readonly logger = new Logger(RedisService.name);

  constructor(private readonly configService: ConfigService<Env, true>) {}

  getClient() {
    return this.client;
  }

  onModuleInit() {
    const redisUrl = this.configService.get('REDIS_URL', { infer: true });

    // If Redis drops, this prevents the Node event loop from hanging forever.
    this.client = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => Math.min(times * 100, 3000), // Exponential backoff maxing at 3s
    });

    this.client.on('error', (err) =>
      this.logger.error(`Redis connection error: ${err.message}`),
    );

    this.client.on('connect', () => {
      this.logger.log('Successfully connected to Redis');
    });
  }

  async onModuleDestroy() {
    this.logger.log('Disconnecting from Redis...');

    // Sometimes .quit() hangs if the connection is completely dead.
    // This races the quit command against a 2-second timeout, then forces a disconnect.
    try {
      await Promise.race([
        this.client.quit(),
        new Promise((resolve) => setTimeout(resolve, 2000)),
      ]);
    } finally {
      this.client.disconnect();
    }
  }

  async get<T = unknown>(keyFn: (ctx: Ctx) => string): Promise<T | null> {
    const key = keyFn(CACHE_KEY);
    this.logger.debug(`Redis GET: ${key}`);

    const value = await this.client.get(key);

    if (!value) {
      this.logger.debug(`Redis key not found: ${key}`);
      return null;
    }

    // JSON.parse() is expensive and throws errors on standard strings.
    // We do a fast check to see if it even looks like JSON before parsing.
    const looksLikeJson =
      (value.startsWith('{') && value.endsWith('}')) ||
      (value.startsWith('[') && value.endsWith(']'));

    if (looksLikeJson) {
      try {
        this.logger.debug(`Redis parsed JSON for key: ${key}`);
        return JSON.parse(value) as T;
      } catch {
        return value as unknown as T;
      }
    }

    return value as unknown as T;
  }

  async set(
    keyFn: (ctx: Ctx) => string,
    value: unknown,
    expireInSeconds?: number,
  ): Promise<void> {
    const key = keyFn(CACHE_KEY);
    const data = typeof value === 'string' ? value : JSON.stringify(value);

    this.logger.debug(
      `Redis SET: ${key}${expireInSeconds ? ` (expires: ${expireInSeconds}s)` : ''}`,
    );

    if (expireInSeconds) {
      await this.client.set(key, data, 'EX', expireInSeconds);
    } else {
      await this.client.set(key, data);
    }
  }

  async del(keyFn: (ctx: Ctx) => string): Promise<void> {
    const key = keyFn(CACHE_KEY);
    this.logger.debug(`Redis DEL: ${key}`);
    await this.client.del(key);
  }

  async exists(keyFn: (ctx: Ctx) => string): Promise<boolean> {
    const key = keyFn(CACHE_KEY);
    const result = (await this.client.exists(key)) > 0;
    this.logger.debug(`Redis EXISTS: ${key} - ${result}`);
    return result;
  }

  async deleteByPattern(keyFn: (ctx: Ctx) => string): Promise<number> {
    const pattern = keyFn(CACHE_KEY);

    if (!/[*?[]/.test(pattern)) {
      return await this.client.unlink(pattern); // 0 or 1
    }

    //everything runs inside Redis to avoid network overhead of multiple round-trips for SCAN + DEL.
    const luaScript = `
    local pattern = ARGV[1]
    local scanCount = tonumber(ARGV[2]) or 100
    local cursor = "0"
    local deleted = 0

    repeat
      local res = redis.call("SCAN", cursor, "MATCH", pattern, "COUNT", scanCount)
      cursor = res[1]
      local keys = res[2]

      if #keys > 0 then
        redis.call("UNLINK", unpack(keys))
        deleted = deleted + #keys
      end
    until cursor == "0"

    return deleted
  `;

    const result = await this.client.eval(luaScript, 0, pattern, 100);

    return result as number;
  }

  async flushDb(): Promise<void> {
    // Usually only used in E2E tests.
    await this.client.flushdb();
  }

  async hSet(
    keyFn: (ctx: Ctx) => string,
    field: string,
    expireInSeconds: number,
  ): Promise<void> {
    const key = keyFn(CACHE_KEY);
    const expiresAt = Date.now() + expireInSeconds * 1000;
    this.logger.debug(`Redis HSET: ${key} field: ${field}`);
    await this.client
      .pipeline()
      .hset(key, field, expiresAt)
      .hexpire(key, expireInSeconds, 'FIELDS', 1, field)
      .exec();
  }

  async hIsMember(
    keyFn: (ctx: Ctx) => string,
    field: string,
  ): Promise<boolean> {
    const key = keyFn(CACHE_KEY);
    const expiresAt = await this.client.hget(key, field);
    if (!expiresAt) return false;
    const valid = Number(expiresAt) > Date.now();
    if (!valid) await this.client.hdel(key, field);
    this.logger.debug(`Redis HGET: ${key} field: ${field} - ${valid}`);
    return valid;
  }

  async hDel(keyFn: (ctx: Ctx) => string, field: string): Promise<void> {
    const key = keyFn(CACHE_KEY);
    this.logger.debug(`Redis HDEL: ${key} field: ${field}`);
    await this.client.hdel(key, field);
  }
}
