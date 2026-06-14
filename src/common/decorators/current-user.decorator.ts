import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import { User } from '@prisma/client';

export const CurrentUser = createParamDecorator(
  <K extends keyof User>(data: K | undefined, ctx: ExecutionContext) => {
    const user = ctx.switchToHttp().getRequest()?.user;

    return data ? user?.[data] : user;
  },
);
