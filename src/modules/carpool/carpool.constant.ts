import { Carpool, Prisma } from '@prisma/client';
import { LocationOmit } from '../address/address.constant';
import { UserMinimalSelect } from '../user/user.constant';

export const CarpoolSearchableFields = [
  'title',
  'notes',
] as const satisfies ReadonlyArray<keyof Carpool>;

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

export const WeekdayMap: Record<Weekdays, string> = {
  Saturday: 'SA',
  Sunday: 'SU',
  Monday: 'MO',
  Tuesday: 'TU',
  Wednesday: 'WE',
  Thursday: 'TH',
  Friday: 'FR',
};

export const CarpoolRepeatFrequency = {
  DAILY: 'DAILY',
  ONCE: 'ONCE',
  CUSTOM: 'CUSTOM',
} as const;
export type CarpoolRepeatFrequency = keyof typeof CarpoolRepeatFrequency;

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

export const CarpoolInviteStatus = {
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  DECLINED: 'DECLINED',
  CANCELLED: 'CANCELLED',
} as const;
export type CarpoolInviteStatus = keyof typeof CarpoolInviteStatus;

export const RoundType = {
  PICKUP: 'PICKUP',
  DROPOFF: 'DROPOFF',
} as const;
export type RoundType = keyof typeof RoundType;

export const RoundStatus = {
  SCHEDULED: 'SCHEDULED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;
export type RoundStatus = keyof typeof RoundStatus;

export const ChecklistStatus = {
  PENDING: 'PENDING',
  PRESENT: 'PRESENT',
  ABSENT: 'ABSENT',
  UNATTENDED: 'UNATTENDED',
} as const;
export type ChecklistStatus = keyof typeof ChecklistStatus;

export const CARPOOL_QUEUE = 'hadikid-carpool';

export const CarpoolJob = {
  NOTIFY_BEFORE_30: 'notify_before_30',
  NOTIFY_BEFORE_15: 'notify_before_15',
} as const;
export type CarpoolJob = keyof typeof CarpoolJob;

export const CarpoolEvent = {
  CREATED: 'carpool.created',
  UPDATED: 'carpool.updated',
  DELETED: 'carpool.deleted',
  DRIVER_ASSIGNED: 'carpool.driver.assigned',
  DRIVER_RESIGNED: 'carpool.driver.resigned',
  MEMBER_INVITED: 'carpool.member.invited',
  INVITE_WITHDRAWN: 'carpool.invite.withdrawn',
  INVITE_ACCEPTED: 'carpool.invite.accepted',
  INVITE_DECLINED: 'carpool.invite.declined',
  MEMBER_LEFT: 'carpool.member.left',
  ROUND_CREATED: 'carpool.round.created',
  ROUND_STARTED: 'carpool.round.started',
  ROUND_COMPLETED: 'carpool.round.completed',
  ROUND_CANCELLED: 'carpool.round.cancelled',
  ROUND_REMINDER: 'carpool.round.reminder',
  VEHICLE_LOCATION_UPDATED: 'carpool.vehicle.location.updated',
} as const;
export type CarpoolEvent = keyof typeof CarpoolEvent;

const checklistSelect = {
  child: {
    select: {
      id: true,
      name: true,
    },
  },
  member: {
    select: {
      user: {
        select: { name: true },
      },
    },
  },
  status: true,
  note: true,
} as const satisfies Prisma.CarpoolRoundPickupChecklistSelect;

export const CarpoolInclude = {
  driver: {
    select: {
      name: true,
    },
  },
  pickup: { omit: LocationOmit },
  dropoff: { omit: LocationOmit },
  vehicleLocation: {
    select: {
      latitude: true,
      longitude: true,
    },
  },
  repeatRule: true,
  members: {
    include: {
      user: { select: { id: true, name: true, email: true, phone: true } },
      children: { select: { id: true, name: true } },
    },
  },
  rounds: {
    where: {
      status: RoundStatus.SCHEDULED,
    },
    omit: {
      carpoolId: true,
    },
    include: {
      driver: {
        select: UserMinimalSelect,
      },
      dropoffChecklists: {
        select: checklistSelect,
      },
      pickupChecklists: {
        select: checklistSelect,
      },
    },
  },
  invites: {
    select: {
      user: {
        select: UserMinimalSelect,
      },
    },
  },
} as const satisfies Prisma.CarpoolInclude;

export const CarpoolSelectForInvited = {
  id: true,
  title: true,
  pickup: { omit: LocationOmit },
  dropoff: { omit: LocationOmit },
  members: {
    where: {
      role: 'OWNER',
    },
    select: {
      user: { select: UserMinimalSelect },
    },
  },
} as const satisfies Prisma.CarpoolSelect;

export const CarpoolInviteSelectForOutgoing = {
  id: true,
  carpoolId: true,
  userId: true,
  status: true,
  message: true,
  expiresAt: true,
  createdAt: true,
  updatedAt: true,
  user: {
    select: UserMinimalSelect,
  },
  carpool: {
    select: {
      id: true,
      title: true,
      pickup: { omit: LocationOmit },
      dropoff: { omit: LocationOmit },
    },
  },
} as const satisfies Prisma.CarpoolInviteSelect;

export const RoundInclude = {
  carpool: {
    include: {
      members: {
        include: {
          user: { select: { id: true, name: true } },
          children: { select: { id: true, name: true } },
        },
      },
    },
  },
  pickupChecklists: {
    include: { child: { select: { id: true, name: true } } },
  },
  dropoffChecklists: {
    include: { child: { select: { id: true, name: true } } },
  },
} as const;

export const VEHICLE_LOCATION_DB_FLUSH_INTERVAL = 10;
