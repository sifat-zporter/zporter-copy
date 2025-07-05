import {
  BadRequestException,
  createParamDecorator,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PermissionService } from '../../authorization/service/permission.service';
import { RouteService } from '../../authorization/service/route.service';
import { db } from '../../config/firebase.config';
import { ResponseMessage } from '../constants/common.constant';

const permissionService = new PermissionService();
const routeService = new RouteService();

/**
 * This function will timezone for user and check authorization:
 *  + if (authorization == true): return userId
 *  + else false : throw UnauthorizationException
 */
export const AuthorizationAndGetUserId = createParamDecorator(
  async (data: any[] = [], ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const routeId = generateRouteId(request);
    

    const userId = request.headers.roleid as string;
    const isAdmin = request?.user?.isAdmin || false;

    if (data.length && data[0] === false) {
      return userId;
    }
    if (!userId) {
      throw new BadRequestException('roleId (user document Id) is required');
    }
    if (isAdmin == true) {
      return userId;
    }

    const userData = await getUserData(userId);
    const { type } = userData;
    const [_, permission] = await Promise.all([
      updateTimzoneForUser(request, userData),
      checkAuthorization(type, routeId),
    ]);

    if (permission) {
      return userId;
    }
  },
);

function generateRouteId(request) {
  const path = request.route.path;
  const method = Object.keys(request.route.methods)[0];

  const routeId = routeService.generateRouteId(path, method);
  console.log('[AUTH] routeId:', routeId, 'method:');
  return routeId;
}

async function updateTimzoneForUser(
  request: any,
  userData: FirebaseFirestore.DocumentData,
) {
  const localTimezone =
    request.headers.timezone || request.headers.Timezone || null;
  if (localTimezone && localTimezone !== userData?.timezone) {
    await db.collection('users').doc(userData.userId).update({
      timezone: localTimezone,
    });
  }
}

export async function getUserData(
  userId: string,
): Promise<FirebaseFirestore.DocumentData> {
  const userRef = await db.collection('users').doc(userId).get();
  if (!userRef.exists) {
    throw new NotFoundException('Not found user!');
  }
  return userRef.data();
}

async function checkAuthorization(type: string, routeId: string) {
  const permission = await permissionService.getOneById(type);

  if (permission.routeIds.includes(routeId)) {
    return true;
  } else {
    throw new ForbiddenException(ResponseMessage.Common.FORBIDDEN_RESOURCE);
  }
}
