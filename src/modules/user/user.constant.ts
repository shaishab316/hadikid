import { Prisma, User } from '@prisma/client';
import { imgSelect } from '../media/media.constant';
import { LocationOmit } from '../address/address.constant';

export const userSearchableFields = [
  'id',
  'email',
  'name',
  'phone',
] as const satisfies ReadonlyArray<keyof User>;

export const UserSelect = {
  id: true,
  slug: true,
  name: true,
  publicEmail: true,
  publicPhone: true,
  profilePicture: {
    select: imgSelect,
  },
  location: {
    omit: LocationOmit,
  },
  emergencyPhone: true,
  gender: true,
  isOnline: true,
  lastOnlineAt: true,
  rating: true,
  ratingCount: true,
  status: true,
} as const satisfies Prisma.UserSelect;
