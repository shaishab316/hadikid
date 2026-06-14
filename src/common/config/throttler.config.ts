import { ThrottlerModuleOptions } from '@nestjs/throttler';

/**
 * Production throttler configuration with multiple presets
 * - Balances security (blocking abuse) with user experience (allowing legitimate use)
 * - Uses Redis for distributed throttling (works with multiple instances)
 */

export const THROTTLE_PRESETS = {
  // High security - auth endpoints, sensitive operations
  // 5 requests per minute
  AUTH: { limit: 5, ttl: 60000 },

  // Strict - password change, admin operations
  // 10 requests per minute
  STRICT: { limit: 10, ttl: 60000 },

  // Medium - authenticated user operations (orders, profile)
  // 30 requests per minute
  MEDIUM: { limit: 30, ttl: 60000 },

  // Relaxed - public/read endpoints (items, restaurants)
  // 60 requests per minute
  RELAXED: { limit: 60, ttl: 60000 },

  // Global default fallback
  // 100 requests per minute (very permissive default)
  DEFAULT: { limit: 100, ttl: 60000 },
};

export const getThrottlerConfig = (): ThrottlerModuleOptions => {
  return [
    {
      name: 'default',
      ttl: THROTTLE_PRESETS.DEFAULT.ttl,
      limit: THROTTLE_PRESETS.DEFAULT.limit,
    },
  ];
};

/**
 * Whitelist patterns - endpoints/IPs that skip throttling
 */
export const THROTTLE_SKIP_PATTERNS = [
  '/health',
  '/docs',
  '/docs-json',
  '/docs-yaml',
  '/queues',
];

/**
 * User agents that indicate bot activity (to be throttled more aggressively)
 */
export const BOT_USER_AGENTS = [
  'bot',
  'crawler',
  'spider',
  'scraper',
  'curl',
  'wget',
  'python',
  'java(?!script)',
  'go-http-client',
  'http.rb',
  'okhttp',
  'axios',
  'nodemon',
];
