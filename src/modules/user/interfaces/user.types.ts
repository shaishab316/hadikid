import { UserRole } from '../user.constant';

export type UnverifiedUser = {
  name: string;
  email: string;
  passwordHash: string;
  role: typeof UserRole.USER;
};

export type UnverifiedEntity = UnverifiedUser;
