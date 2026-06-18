import { omit } from 'node_modules/zod/v4/core/util.cjs';
import { LocationOmit } from '../address/address.constant';

export const Weekdays = {
  Saturday: 'Saturday',
  Sunday: 'Sunday',
  Monday: 'Monday',
  Tuesday: 'Tuesday',
  Wednesday: 'Wednesday',
  Thursday: 'Thursday',
  Friday: 'Friday',
} as const;
export type Weekdays = keyof typeof Weekdays;

export const WeekdayMap = {
  Saturday: 'SA',
  Sunday: 'SU',
  Monday: 'MO',
  Tuesday: 'TU',
  Wednesday: 'WE',
  Thursday: 'TH',
  Friday: 'FR',
} as const;

export const CarpoolRepeatFrequency = {
  DAILY: 'DAILY',
  ONCE: 'ONCE',
  CUSTOM: 'CUSTOM',
} as const;
export type CarpoolRepeatFrequency = keyof typeof CarpoolRepeatFrequency;

export const CarpoolInclude = {
  pickup: {
    omit: LocationOmit,
  },
  dropoff: {
    omit: LocationOmit,
  },
  repeatRule: true,
  members: {
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
        },
      },
      children: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  },
};

export const CarpoolRole = {
  OWNER: 'OWNER',
  MEMBER: 'MEMBER',
} as const;

export type CarpoolRole = keyof typeof CarpoolRole;

export const CarpoolStatus = {
  ACTIVE: 'ACTIVE',
  PAUSED: 'PAUSED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;

export type CarpoolStatus = keyof typeof CarpoolStatus;
