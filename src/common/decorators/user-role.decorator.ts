import {
  BadRequestException,
  ExecutionContext,
  createParamDecorator,
} from '@nestjs/common';
import { getUserData } from './authorization.decorator';
import { ResponseMessage } from '../constants/common.constant';

export const RoleUser = createParamDecorator(
  async (data: any[] = [], ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const userId = request.headers.roleid as string;

    if (!userId) {
      throw new BadRequestException('roleId (user document Id) is required');
    }

    const userData = await getUserData(userId);
    const { type } = userData;
    if (!data.includes(type))
      throw new BadRequestException(ResponseMessage.Common.FORBIDDEN_RESOURCE);

    return userId;
  },
);
