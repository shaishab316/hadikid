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

export const CarpoolRepeatFrequency = {
  DAILY: 'DAILY',
  ONCE: 'ONCE',
  CUSTOM: 'CUSTOM',
} as const;
export type CarpoolRepeatFrequency = keyof typeof CarpoolRepeatFrequency;

export const CarpoolInclude = {
  pickup: true,
  dropoff: true,
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

