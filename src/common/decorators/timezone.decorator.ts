import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const Timezone = createParamDecorator(
  async (data: any[] = [], ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();

    const timezone = request.headers?.timezone || process.env.DEFAULT_TIMEZONE;
    return timezone;
  },
);
