import { UserRole } from '@/modules/user/user.constant';
import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) =>
  SetMetadata<typeof ROLES_KEY, UserRole[]>(ROLES_KEY, roles);
