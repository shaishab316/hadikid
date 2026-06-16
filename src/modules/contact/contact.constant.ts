import { Prisma } from '@prisma/client';
import { UserSelect } from '../user/user.constant';

export const ContactRequestInclude: Prisma.ContactRequestInclude = {
  sender: {
    select: UserSelect,
  },
  receiver: {
    select: UserSelect,
  },
};

export const ContactInclude: Prisma.ContactInclude = {
  user1: {
    select: UserSelect,
  },
  user2: {
    select: UserSelect,
  },
};

export const ContactRequestStatus = {
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  DECLINED: 'DECLINED',
  CANCELLED: 'CANCELLED',
} as const;

export type ContactRequestStatusType = keyof typeof ContactRequestStatus;
