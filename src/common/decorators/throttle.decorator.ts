import { SetMetadata } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';

/**
 * Decorator keys for throttle levels
 */
export const THROTTLE_LEVEL_KEY = 'throttle_level';

/**
 * Throttle level - Auth endpoints: 5 req/min
 * Use for: login, registration, password reset, OTP verification
 */
export const AuthThrottle = () =>
  Throttle({ default: { limit: 5, ttl: 60000 } });

/**
 * Throttle level - Strict operations: 10 req/min
 * Use for: password change, payment processing, sensitive updates
 */
export const StrictThrottle = () =>
  Throttle({ default: { limit: 10, ttl: 60000 } });

/**
 * Throttle level - Medium authenticated operations: 30 req/min
 * Use for: create/update orders, user profile changes, rider updates
 */
export const MediumThrottle = () =>
  Throttle({ default: { limit: 30, ttl: 60000 } });

/**
 * Throttle level - Relaxed public endpoints: 60 req/min
 * Use for: list items, categories, search, public reads
 */
export const RelaxedThrottle = () =>
  Throttle({ default: { limit: 60, ttl: 60000 } });

/**
 * Bypass throttling entirely for public health/status endpoints
 */
export const SkipThrottle = () => SetMetadata('skip_throttle', true);
