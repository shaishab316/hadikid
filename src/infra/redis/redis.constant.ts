export const CACHE_KEY = {
  RESPONSE: (key: string) => `hadikid:response:${key}`,
  USER: {
    TEMPORARY: (identifier: string) => `hadikid:user:temporary:${identifier}`,
  },
  OTP: (key: string, reason: string) => `hadikid:otp:${reason}:${key}`,
  TOKEN: {
    REFRESH: (userId: string) => `hadikid:token:refresh:${userId}`,
  },
  CARPOOL: {
    ROUND_JOB: (roundId: string, suffix: string) =>
      `hadikid:carpool:round:${roundId}:job:${suffix}`,
    VEHICLE_LOCATION: (carpoolId: string) =>
      `hadikid:carpool:${carpoolId}:vehicle`,
  },
} as const;
