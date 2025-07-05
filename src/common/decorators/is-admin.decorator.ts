import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const IsAdmin = createParamDecorator(
  async (data: any[] = [], ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const isAdmin = (request.user?.isAdmin as boolean) || false;

    return isAdmin;
  },
);
