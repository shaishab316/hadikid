import { UserRole } from '@prisma/client';

export type UnverifiedUser = {
  name: string;
  email: string;
  passwordHash: string;
  role: typeof UserRole.USER;
};

export type UnverifiedEntity = UnverifiedUser;
