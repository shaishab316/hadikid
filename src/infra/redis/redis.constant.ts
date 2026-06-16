export const CACHE_KEY = {
  RESPONSE: (key: string) => `hadikid:response:${key}`,
  USER: {
    TEMPORARY: (identifier: string) => `hadikid:user:temporary:${identifier}`,
  },
  OTP: (key: string, reason: string) => `hadikid:otp:${reason}:${key}`,
  TOKEN: {
    REFRESH: (userId: string) => `hadikid:token:refresh:${userId}`,
  },
} as const;
