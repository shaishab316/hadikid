import { RedisService } from '@/infra/redis/redis.service';
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { mergeMap, Observable, of } from 'rxjs';

export const CACHE_KEY_METADATA = 'cache_key';
export const CACHE_TTL_METADATA = 'cache_ttl';
export const INVALIDATE_CACHE_METADATA = 'invalidate_cache';

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  private readonly logger = new Logger(CacheInterceptor.name);

  constructor(
    private readonly redis: RedisService,
    private readonly reflector: Reflector,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const res = context.switchToHttp().getResponse();
    const req = context.switchToHttp().getRequest();
    const query = req.query as Record<string, string>;

    const sortedQuery = Object.keys(query)
      .filter((k) => query[k] !== '' && query[k] !== undefined)
      .sort()
      .map((k) => `${k}=${query[k]}`)
      .join('&');

    const invalidateKeys = this.reflector.get<string[]>(
      INVALIDATE_CACHE_METADATA,
      context.getHandler(),
    );

    if (invalidateKeys?.length) {
      this.logger.debug(`Cache invalidation for ${invalidateKeys.length} keys`);
      return next.handle().pipe(
        mergeMap(async (data) => {
          const resolvedKeys = invalidateKeys.map((key) =>
            resolvedCacheKeyFromTemplate(key, req),
          );

          await Promise.all(
            resolvedKeys.map((key) =>
              this.redis.deleteByPattern(({ RESPONSE }) => RESPONSE(key)),
            ),
          );
          return data;
        }),
      );
    }

    const cacheKey = this.reflector.get<string>(
      CACHE_KEY_METADATA,
      context.getHandler(),
    );
    if (!cacheKey) return next.handle();

    let resolvedCacheKey = resolvedCacheKeyFromTemplate(cacheKey, req);

    resolvedCacheKey = sortedQuery
      ? `${resolvedCacheKey}:${sortedQuery}`
      : resolvedCacheKey;

    const ttl =
      this.reflector.get<number>(CACHE_TTL_METADATA, context.getHandler()) ??
      60;

    this.logger.debug(`Checking cache for: ${resolvedCacheKey}`);

    try {
      const cached = await this.redis.get<any>(({ RESPONSE }) =>
        RESPONSE(resolvedCacheKey),
      );

      if (cached) {
        this.logger.log(`Cache HIT: ${resolvedCacheKey} (TTL: ${ttl}s)`);
        res.setHeader('X-Cache', 'HIT');
        return of(cached);
      }

      this.logger.log(`Cache MISS: ${resolvedCacheKey}`);
    } catch (error) {
      this.logger.warn(`Cache retrieval error for ${resolvedCacheKey}:`, error);
      /* no-op */
    }

    return next.handle().pipe(
      mergeMap(async (data) => {
        res.setHeader('X-Cache', 'MISS');
        try {
          await this.redis.set(
            ({ RESPONSE }) => RESPONSE(resolvedCacheKey),
            data,
            ttl,
          );
          this.logger.debug(`Cache stored: ${resolvedCacheKey} (TTL: ${ttl}s)`);
        } catch (error) {
          this.logger.warn(
            `Cache storage error for ${resolvedCacheKey}:`,
            error,
          );
          /* no-op */
        }
        return data;
      }),
    );
  }
}

export function resolvedCacheKeyFromTemplate(
  template: string,
  req: any,
): string {
  return template.replace(/:(\w+\.\w+)/g, (_, path) => {
    try {
      const [source, field] = path.split('.');
      if (source === 'params') return req.params?.[field] ?? path;
      if (source === 'body') return req.body?.[field] ?? path;
      if (source === 'user') return req.user?.[field] ?? path;

      /**
       * add more sources if needed, e.g. headers, cookies, etc.
       */

      return path;
    } catch (error) {
      Logger.error(
        'Error occurred while resolving cache key',
        error,
        'resolvedCacheKeyFromTemplate',
      );
      return path;
    }
  });
}
