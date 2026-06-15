import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { User } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UserRole } from '@/modules/user/user.constant';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // no @Roles() decorator — allow all authenticated users
    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user: User }>();

    const user = request.user;

    void user;

    // todo: this should be handled by AuthGuard, but just in case

    return true;
  }
}
