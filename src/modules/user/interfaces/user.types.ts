import { Prisma } from '@prisma/client';
import { UserRole } from '../user.constant';
import { imgSelect } from '@/modules/media/media.constant';
import { LocationOmit } from '@/modules/address/address.constant';

export type UnverifiedUser = {
  name: string;
  phone: string;
  passwordHash: string;
  role: typeof UserRole.USER;
  email?: string;
};

export type UnverifiedEntity = UnverifiedUser;
