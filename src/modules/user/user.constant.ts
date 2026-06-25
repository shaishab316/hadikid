import { Prisma, User } from '@prisma/client';
import { imgSelect } from '../media/media.constant';
import { LocationOmit } from '../address/address.constant';

export const userSearchableFields = [
  'slug',
  'email',
  'name',
  'phone',
] as const satisfies ReadonlyArray<keyof User>;

export const UserSelect = {
  id: true,
  slug: true,
  name: true,
  email: true,
  publicEmail: true,
  phone: true,
  publicPhone: true,
  profilePicture: {
    select: imgSelect,
  },
  bio: true,
  location: {
    omit: LocationOmit,
  },
  emergencyPhone: true,
  gender: false,
  isOnline: true,
  lastOnlineAt: true,
  rating: true,
  ratingCount: true,
  status: false,
  createdAt: true,
  _count: {
    select: { children: true, carpoolMembers: true, driverCarpools: true },
  },
} as const satisfies Prisma.UserSelect;

export const UserMinimalSelect = {
  id: true,
  name: true,
  phone: true,
  profilePicture: {
    select: imgSelect,
  },
} as const satisfies Prisma.UserSelect;

export const UserRole = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  USER: 'USER',
} as const;

export const UserStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  LOCKED: 'LOCKED',
  SUSPENDED: 'SUSPENDED',
  DELETED: 'DELETED',
} as const;

export const Gender = {
  MALE: 'MALE',
  FEMALE: 'FEMALE',
  NOT_SPECIFIED: 'NOT_SPECIFIED',
} as const;

export type UserRole = keyof typeof UserRole;
export type UserStatus = keyof typeof UserStatus;
export type Gender = keyof typeof Gender;
