import {
  BadRequestException,
  createParamDecorator,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { db } from '../../config/firebase.config';
import { AuthorizationAndGetUserId } from './authorization.decorator';

// export const UserRoleId = createParamDecorator(
//   async (data: any[] = [], ctx: ExecutionContext) => {
//     const request = ctx.switchToHttp().getRequest();
//     const header = request.headers;

//     const userId = request.headers.roleid as string;
//     const isAdmin = request.user?.isAdmin as boolean || false;

//     let localTimezone = header.timezone || header.Timezone || null;

//     if (data.length && data[0] === false) {
//       return userId;
//     }

//     if (!userId) {
//       throw new BadRequestException('roleId (user document Id) is required');
//     }

//     const userRef = await db.collection('users').doc(userId).get();

//     if (localTimezone && localTimezone !== userRef.data()?.timezone) {
//       await db.collection('users').doc(userId).update({
//         timezone: localTimezone,
//       });
//     }

//     if (!isAdmin && data.length && !data.includes(userRef.data()?.type)) {
//       throw new HttpException(
//         `You don't have permission to access this resource`,
//         HttpStatus.FORBIDDEN,
//       );
//     }

//     return userId;
//   },
// );

/**
 * Update: replace UserRoleId by AuthorizationAndGetUserId 
 * 
 * ==> Maybe we can rollback to the old authorization method.
 */
//# 
//# 
export const UserRoleId = AuthorizationAndGetUserId;
