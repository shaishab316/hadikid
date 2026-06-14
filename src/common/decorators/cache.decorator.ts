import { SetMetadata } from '@nestjs/common';
import {
  CACHE_KEY_METADATA,
  CACHE_TTL_METADATA,
  INVALIDATE_CACHE_METADATA,
} from '../interceptors/cache.interceptor';

export const CacheKey = (key: string) => SetMetadata(CACHE_KEY_METADATA, key);
export const CacheTTL = (ttl: number) => SetMetadata(CACHE_TTL_METADATA, ttl);
export const InvalidateCache = (...keys: string[]) =>
  SetMetadata(INVALIDATE_CACHE_METADATA, keys);
