export const CACHE_KEY = {
  RESPONSE: (key: string) => `response:${key}`,
  USER: {
    TEMPORARY: (identifier: string) => `user:temporary:${identifier}`,
  },
  OTP: (key: string, reason: string) => `otp:${reason}:${key}`,
  TOKEN: {
    REFRESH: (userId: string) => `token:refresh:${userId}`,
  },
  FOOD: {
    POPULAR: 'food:popular',
  },
  LOCK: {
    PAY_RIDE: (rideId: string) => `lock:ride_payment:${rideId}`,
  },
} as const;
